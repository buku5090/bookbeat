import React from "react";

export default function LoadingPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black">
      <img
        src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG5reHBlc2drOGNld3ZqMzk4YWYwNTVrY3ZibTBoZ2Q2YnMwaG45NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4EFt4UAegpqTy3nVce/giphy.gif"
        alt="Loading..."
        className="w-48 h-48 object-contain"
      />
    </div>
  );
}
