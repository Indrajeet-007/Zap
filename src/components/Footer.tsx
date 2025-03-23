import croplogo from "/croplogo.jpg";

export default function Footer() {
  return (
    <footer className="backdrop-blur-lg mt-5">
      <div className="max-w-7xl mx-auto flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-md ">
            <img src={croplogo} alt="SwiftShare logo" className="w-8 h-8" />
          </span>
          <span className="text-lg font-semibold text-neutral-800">
            SwiftShare
          </span>
        </div>
        <p className="text-neutral-600 text-sm text-center">
          Share files seamlessly anytime, anywhere.
        </p>
      </div>
    </footer>
  );
}
