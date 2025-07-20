import React from "react";

export default function LoadingPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-white border-opacity-30 border-t-violet-600" />
    </div>
  );
}
