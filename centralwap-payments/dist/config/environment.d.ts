export declare const config: {
    port: number;
    nodeEnv: string;
    baseUrl: string;
    supabase: {
        url: string;
        serviceKey: string;
    };
    mercadopago: {
        accessToken: string;
        publicKey: string;
    };
    siro: {
        apiKey: string;
        comercioId: string;
        apiUrl: string;
    };
    stripe: {
        secretKey: string;
        publishableKey: string;
        webhookSecret: string;
    };
    dlocal: {
        apiKey: string;
        secretKey: string;
        apiUrl: string;
    };
    webhooks: {
        pagoConfirmado: string;
        envioMensaje: string;
    };
    frontendUrl: string;
};
export declare function validateConfig(): string[];
//# sourceMappingURL=environment.d.ts.map