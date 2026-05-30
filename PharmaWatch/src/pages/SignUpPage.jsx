import { SignUp } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export default function SignUpPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      <p style={{ marginTop: "1rem" }}>
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}

