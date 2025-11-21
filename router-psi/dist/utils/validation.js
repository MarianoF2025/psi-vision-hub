"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookPayloadSchema = exports.messageSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.messageSchema = joi_1.default.object({
    from: joi_1.default.string().required(),
    id: joi_1.default.string().required(),
    timestamp: joi_1.default.string().required(),
    type: joi_1.default.string()
        .valid('text', 'image', 'audio', 'document', 'location', 'button', 'interactive')
        .required(),
    text: joi_1.default.object({ body: joi_1.default.string().allow('') }).optional(),
    image: joi_1.default.object({ link: joi_1.default.string().uri() }).optional(),
    audio: joi_1.default.object({ link: joi_1.default.string().uri(), mime_type: joi_1.default.string().optional() }).optional(),
    document: joi_1.default.object({ link: joi_1.default.string().uri(), filename: joi_1.default.string().optional() }).optional(),
    interactive: joi_1.default.object({
        type: joi_1.default.string(),
        button_reply: joi_1.default.object({
            id: joi_1.default.string(),
            title: joi_1.default.string(),
        }).optional(),
        list_reply: joi_1.default.object({
            id: joi_1.default.string(),
            title: joi_1.default.string(),
        }).optional(),
    }).optional(),
});
exports.webhookPayloadSchema = joi_1.default.object({
    messaging_product: joi_1.default.string().valid('whatsapp').required(),
    metadata: joi_1.default.object({
        display_phone_number: joi_1.default.string().required(),
        phone_number_id: joi_1.default.string().required(),
    }).required(),
    messages: joi_1.default.array().items(exports.messageSchema).required(),
    contacts: joi_1.default.array().optional(),
});
