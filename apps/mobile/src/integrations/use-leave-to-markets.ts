import { useRouter } from "expo-router";
import { useEffect } from "react";

export function useLeaveToMarkets(leave: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (leave) router.dismissTo("/");
  }, [leave, router]);
}
