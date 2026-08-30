/**
 * EduCom WhatsApp Client
 * Encapsulates calls to the Meta WhatsApp Cloud API.
 * 
 * Credentials should always come from environment variables.
 * In a multi-tenant setup, this client can be instantiated with per-school credentials
 * loaded from the DB, but for V1 we rely on ENV vars as the foundation.
 */

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

export class WhatsAppClient {
  private apiUrl = "https://graph.facebook.com/v19.0";

  constructor(private config: WhatsAppConfig) {}

  /**
   * Retrieves the config for a specific school from the database.
   * Falls back to environment variables if not configured in the DB for local dev.
   */
  static async forSchool(schoolId: string): Promise<WhatsAppClient> {
    const { prisma } = await import("@/lib/prisma");
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { whatsappAccessToken: true, whatsappPhoneNumberId: true }
    });

    if (school?.whatsappAccessToken && school?.whatsappPhoneNumberId) {
      return new WhatsAppClient({
        accessToken: school.whatsappAccessToken,
        phoneNumberId: school.whatsappPhoneNumberId
      });
    }

    // Fallback to Env for local dev/testing
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      throw new Error("WhatsApp is not configured for this school.");
    }

    return new WhatsAppClient({ accessToken, phoneNumberId });
  }

  /**
   * Send a free-form text message.
   * Can only be used within the 24h customer service window.
   */
  async sendTextMessage(to: string, text: string): Promise<{ messages: { id: string }[] }> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    };

    return this.sendRequest(payload);
  }

  /**
   * Send a template message.
   * Used for initiating conversations outside the 24h window.
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "fr",
    components: unknown[] = []
  ): Promise<unknown> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components,
      },
    };

    return this.sendRequest(payload);
  }

  private async sendRequest(payload: Record<string, unknown>): Promise<{ messages: { id: string }[] }> {
    if (process.env.NEXT_PUBLIC_ENABLE_META_SIMULATOR === "true") {
      console.log("[META SIMULATOR] Intercepted WhatsApp API Request:", JSON.stringify(payload));
      return { messages: [{ id: `mock-wa-id-${Date.now()}` }] };
    }

    const url = `${this.apiUrl}/${this.config.phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API Error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<{ messages: { id: string }[] }>;
  }
}
