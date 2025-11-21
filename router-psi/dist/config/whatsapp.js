"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPhoneId = exports.whatsappClient = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("./environment");
exports.whatsappClient = axios_1.default.create({
    baseURL: environment_1.Env.whatsapp.baseUrl,
    headers: {
        Authorization: `Bearer ${environment_1.Env.whatsapp.token}`,
        'Content-Type': 'application/json',
    },
});
const getPhoneId = (context) => {
    return environment_1.Env.whatsapp.phoneIds[context];
};
exports.getPhoneId = getPhoneId;
