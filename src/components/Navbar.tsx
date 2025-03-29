import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between pb-2 backdrop-blur-lg">
      <Link to="/">
        <div className="flex items-center space-x-2">
          <span className="mr-0 flex h-10 w-8 items-center justify-center rounded-md pr-0">
            <img src={"/zap.png"} alt="Zap logo" className="h-8 w-6" />
          </span>
          <span className="ml-0 pl-0 text-lg font-semibold text-neutral-800">
            Zap
          </span>
        </div>
      </Link>
    </nav>
  );
}
