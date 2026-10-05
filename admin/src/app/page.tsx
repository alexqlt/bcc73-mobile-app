export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="relative w-full max-w-xl overflow-hidden bg-surface p-10">
        {/* Coin jaune en biseau, signature du style Club. */}
        <div className="absolute top-0 right-0 h-0 w-0 border-t-[48px] border-l-[48px] border-t-accent border-l-transparent" />
        <p className="font-heading text-sm uppercase tracking-widest text-muted">
          Badminton Club de Chambéry
        </p>
        <h1 className="mt-2 text-4xl">
          BCC<span className="ml-1 bg-accent px-2 text-on-accent">73</span>{" "}
          Administration
        </h1>
        <div className="mt-3 h-1.5 w-12 -skew-x-[20deg] bg-accent" />
        <p className="mt-6 text-muted">
          Le back-office est en construction. Les écrans Adhérents,
          Utilisateurs, Rôles, Actualités, Planning et Stages arriveront au fil
          des phases du projet.
        </p>
      </div>
    </main>
  );
}
