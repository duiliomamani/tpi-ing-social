"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PresentationModeModal } from "@/components/PresentationModeModal";

export default function PresentacionPage() {
  const router = useRouter();

  return (
    <PresentationModeModal
      isOpen={true}
      onClose={() => router.push("/")}
      onJumpToTab={() => router.push("/")}
    />
  );
}
