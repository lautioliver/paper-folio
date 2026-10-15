export type ShareResult = "compartido" | "copiado" | "cancelado" | "error";

export type ShareData = { title: string; url: string };

// Subconjunto de Navigator que usamos: se inyecta en los tests.
export type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export async function copyText(_text: string, _nav: ShareNavigator): Promise<boolean> {
  return false;
}

export async function shareOrCopy(_data: ShareData, _nav: ShareNavigator): Promise<ShareResult> {
  return "error";
}
