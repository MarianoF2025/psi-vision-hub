import Joi from 'joi';

export const messageSchema = Joi.object({
  from: Joi.string().required(),
  id: Joi.string().required(),
  timestamp: Joi.string().required(),
  type: Joi.string()
    .valid('text', 'image', 'audio', 'document', 'location', 'button', 'interactive')
    .required(),
  text: Joi.object({ body: Joi.string().allow('') }).optional(),
  image: Joi.object({ link: Joi.string().uri() }).optional(),
  audio: Joi.object({ link: Joi.string().uri(), mime_type: Joi.string().optional() }).optional(),
  document: Joi.object({ link: Joi.string().uri(), filename: Joi.string().optional() }).optional(),
  interactive: Joi.object({
    type: Joi.string(),
    button_reply: Joi.object({
      id: Joi.string(),
      title: Joi.string(),
    }).optional(),
    list_reply: Joi.object({
      id: Joi.string(),
      title: Joi.string(),
    }).optional(),
  }).optional(),
});

export const webhookPayloadSchema = Joi.object({
  messaging_product: Joi.string().valid('whatsapp').required(),
  metadata: Joi.object({
    display_phone_number: Joi.string().required(),
    phone_number_id: Joi.string().required(),
  }).required(),
  messages: Joi.array().items(messageSchema).required(),
  contacts: Joi.array().optional(),
});
