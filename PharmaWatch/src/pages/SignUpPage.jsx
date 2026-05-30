import { SignUp } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export default function SignUpPage() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] py-12 px-4 bg-base-100 flex-1">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      <p className="mt-4 text-xs md:text-sm text-base-content/60 font-semibold">
        Already have an account?{" "}
        <Link to="/sign-in" className="text-primary hover:underline font-bold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
