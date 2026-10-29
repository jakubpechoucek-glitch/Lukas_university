import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  { to: '/katalog', title: 'Katalog škol', text: 'Programy ve 4 oborech, editace, požadavky na IB.' },
  { to: '/predikce', title: 'Predikce IB', text: 'Scénáře známek a celkové skóre (max. 45).' },
  { to: '/predmety', title: 'Předměty', text: 'Assessmenty, váhy, termíny a vážený průměr.' },
  { to: '/matice', title: 'Matice', text: 'Které školy jsou dosažitelné v kterém scénáři.' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ahoj, {user?.name}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="card block hover:border-primary">
            <h2 className="font-medium">{s.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
