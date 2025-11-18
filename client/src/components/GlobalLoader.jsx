import React from "react";
import { useSelector } from "react-redux";

export default function GlobalLoader() {
  const loading = useSelector((state) => state.loader.loading);

  if (!loading) return null;

  return (
    <div className="fixed inset-0  flex items-center justify-center z-[9999]">
      <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin">
      </div>
    </div>
  );
}
