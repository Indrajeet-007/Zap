import { Link } from "react-router-dom";
import croplogo from "/croplogo.jpg";

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between pb-2 backdrop-blur-lg">
      <Link to="/">
        <div className="flex items-center space-x-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md">
            <img
              src={croplogo || "/placeholder.svg"}
              alt="SwiftShare logo"
              className="h-8 w-8"
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
