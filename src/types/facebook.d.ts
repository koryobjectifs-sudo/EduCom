interface Window {
  fbAsyncInit: () => void;
  FB: {
    init: (options: {
      appId: string;
      cookie?: boolean;
      xfbml?: boolean;
      version: string;
    }) => void;
    login: (
      callback: (response: { authResponse?: { accessToken: string } }) => void,
      options?: Record<string, unknown>
    ) => void;
  };
}
