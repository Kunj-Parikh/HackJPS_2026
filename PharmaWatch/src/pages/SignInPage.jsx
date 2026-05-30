import { SignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export default function SignInPage() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] py-12 px-4 bg-base-100 flex-1">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      <p className="mt-4 text-xs md:text-sm text-base-content/60 font-semibold">
        Don't have an account?{" "}
        <Link to="/sign-up" className="text-primary hover:underline font-bold">
          Sign up
        </Link>
      </p>
    </div>
  );
}
