
export default function Footer() {
  return (
    <footer className="mt-5 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl flex-col items-center space-y-4">
        <div className="flex items-center space-x-2">
          <span className="mr-0 flex h-10 w-8 items-center justify-center rounded-md pr-0">
            <img src={"/zap.png"} alt="Zap logo" className="h-8 w-6" />
          </span>
          <span className="text-lg font-semibold text-neutral-800">Zap</span>
        </div>
        <p className="text-center text-sm text-neutral-600">
          Share files seamlessly anytime, anywhere.
        </p>
      </div>
    </footer>
  );
}
