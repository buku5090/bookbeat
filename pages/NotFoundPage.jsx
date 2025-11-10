export default function NotFoundPage() {
  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-3xl w-full grid gap-8 text-center">
        <div className="grid gap-3">
          <p className="text-sm tracking-widest text-white/60">ERROR</p>
          <h1 className="text-6xl md:text-7xl font-bold">404</h1>
          <p className="text-lg md:text-xl text-white/70">Pagina pe care o cauți nu există sau a fost mutată.</p>
        </div>

        {/* Visual */}
        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10">
          {/* Swap this GIF with your own from CDN/Storage */}
          <img
            src="https://media.giphy.com/media/14uQ3cOFteDaU/giphy.gif"
            alt="Confused Travolta - 404"
            className="w-full h-[280px] object-cover"
            loading="lazy"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="px-5 py-3 rounded-2xl bg-white text-black font-medium hover:bg-white/90 transition shadow">
            Înapoi acasă
          </a>
          <a
            href="/search"
            className="px-5 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition shadow">
            Caută artiști & locații
          </a>
        </div>
      </div>
    </main>
  );
}
