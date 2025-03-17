import { Button } from "@/components/ui/button";
import Link from "next/link";

const NotAuthenticatedMessage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <p className="mb-4">
        You need to be logged in to view this page
      </p>
      <Button asChild>
        <Link href="/login">Login</Link>
      </Button>
    </div>
  </div>
);

export default NotAuthenticatedMessage;