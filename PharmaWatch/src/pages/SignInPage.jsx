import { SignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export default function SignInPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      <p style={{ marginTop: "1rem" }}>
        Don't have an account? <Link to="/sign-up">Sign up</Link>
      </p>
    </div>
  );
}

