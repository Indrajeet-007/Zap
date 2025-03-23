import { Link } from "react-router-dom";
import croplogo from "/croplogo.jpg";

export default function NavBar() {
  return (
    <nav className="flex pb-2 items-center justify-between backdrop-blur-lg ">
      <Link to="/">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-md ">
            <img
              src={croplogo || "/placeholder.svg"}
              alt="SwiftShare logo"
              className="w-8 h-8"
            />
          </span>
          <span className="text-lg font-semibold text-neutral-800">
            SwiftShare
          </span>
        </div>
      </Link>
    </nav>
  );
}
