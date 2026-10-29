import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ibTotals, evaluateProgram } from '@calc';

const DataContext = createContext(null);

const apiError = (err) => err.response?.data?.error || 'Uložení se nezdařilo';

/** Předměty scénáře ve tvaru, který očekávají výpočty v shared/calc. */
export function scenarioSubjects(subjects, scenario) {
  return subjects.map((s) => ({ code: s.code, level: s.level, grade: scenario?.grades?.[s.id] ?? null }));
}

export function scenarioTotals(subjects, scenario) {
  return ibTotals(scenarioSubjects(subjects, scenario), scenario?.corePoints ?? 0, {
    tok: scenario?.tokGrade, ee: scenario?.eeGrade,
  });
}

export function DataProvider({ children }) {
  const [catalog, setCatalog] = useState(null);
  const [student, setStudent] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api.get('/catalog'), api.get('/student')]);
      setCatalog(c.data.data);
      setStudent(s.data.data);
      setError(null);
    } catch (err) {
      setError(apiError(err));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Obecný pomocník: zavolá API, při chybě ukáže hlášku a načte data znovu (vrátí optimistickou změnu).
  const call = useCallback(async (fn) => {
    try {
      return await fn();
    } catch (err) {
      toast.error(apiError(err));
      reload();
      throw err;
    }
  }, [reload]);

  const actions = useMemo(() => ({
    reload,

    // --- katalog ---
    async saveProgram(program) {
      const { data } = await call(() => (program.id
        ? api.put(`/catalog/programs/${program.id}`, program)
        : api.post('/catalog/programs', program)));
      setCatalog((c) => ({
        ...c,
        programs: program.id ? c.programs.map((p) => (p.id === program.id ? data.data : p)) : [...c.programs, data.data],
      }));
      return data.data;
    },
    async updateProgramField(id, patch) {
      setCatalog((c) => ({ ...c, programs: c.programs.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      await call(() => api.put(`/catalog/programs/${id}`, patch));
    },
    async deleteProgram(id) {
      await call(() => api.delete(`/catalog/programs/${id}`));
      setCatalog((c) => ({ ...c, programs: c.programs.filter((p) => p.id !== id) }));
    },
    async saveUniversity(uni) {
      const { data } = await call(() => (uni.id
        ? api.put(`/catalog/universities/${uni.id}`, uni)
        : api.post('/catalog/universities', uni)));
      setCatalog((c) => ({
        ...c,
        universities: (uni.id ? c.universities.map((u) => (u.id === uni.id ? data.data : u)) : [...c.universities, data.data])
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
      return data.data;
    },
    async deleteUniversity(id) {
      await call(() => api.delete(`/catalog/universities/${id}`));
      setCatalog((c) => ({ ...c, universities: c.universities.filter((u) => u.id !== id) }));
    },

    // --- scénáře ---
    async updateScenario(id, patch) {
      setStudent((s) => ({
        ...s,
        scenarios: s.scenarios.map((sc) => (sc.id === id
          ? { ...sc, ...patch, grades: patch.grades ? { ...sc.grades, ...patch.grades } : sc.grades }
          : sc)),
      }));
      await call(() => api.put(`/scenarios/${id}`, patch));
    },
    async createScenario(name, copyFrom) {
      const { data } = await call(() => api.post('/scenarios', { name, copyFrom }));
      setStudent((s) => ({ ...s, scenarios: [...s.scenarios, data.data] }));
      return data.data;
    },
    async activateScenario(id) {
      setStudent((s) => ({ ...s, scenarios: s.scenarios.map((sc) => ({ ...sc, isActive: sc.id === id })) }));
      await call(() => api.post(`/scenarios/${id}/activate`));
    },
    async deleteScenario(id) {
      const { data } = await call(() => api.delete(`/scenarios/${id}`));
      setStudent((s) => ({ ...s, scenarios: data.data }));
    },

    // --- předměty a assessmenty ---
    async updateSubject(id, patch) {
      setStudent((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      await call(() => api.put(`/subjects/${id}`, patch));
    },
    async createAssessment(assessment) {
      const { data } = await call(() => api.post('/assessments', assessment));
      setStudent((s) => ({ ...s, assessments: [...s.assessments, data.data] }));
    },
    async updateAssessment(id, patch) {
      setStudent((s) => ({ ...s, assessments: s.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      await call(() => api.put(`/assessments/${id}`, patch));
    },
    async deleteAssessment(id) {
      setStudent((s) => ({ ...s, assessments: s.assessments.filter((a) => a.id !== id) }));
      await call(() => api.delete(`/assessments/${id}`));
    },
  }), [call, reload]);

  const value = useMemo(() => {
    const activeScenario = student?.scenarios.find((s) => s.isActive) ?? student?.scenarios[0] ?? null;
    return { catalog, student, error, activeScenario, ...actions };
  }, [catalog, student, error, actions]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

/** Vyhodnocení všech programů pro daný scénář → Map(programId → výsledek). */
export function useEvaluation(scenario) {
  const { catalog, student } = useData();
  return useMemo(() => {
    if (!catalog || !student || !scenario) return new Map();
    const subjects = scenarioSubjects(student.subjects, scenario);
    const totals = scenarioTotals(student.subjects, scenario);
    return new Map(catalog.programs.map((p) => [p.id, evaluateProgram(p, subjects, totals)]));
  }, [catalog, student, scenario]);
}
