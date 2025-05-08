# -*- coding: utf-8 -*-
import logging

from odoo import models, api, fields

_logger = logging.getLogger(__name__)

MSG_TYPES = ['user_notification', 'notification']
MSG_MODELS = ['project.project', 'project.task', 'hr.leave', 'sale.order', 'crm.lead', 'approval.request']

class MailMessage(models.Model):
    _inherit = 'mail.message'

    @api.model
    def create(self, vals):
        res = super(MailMessage, self).create(vals)
        res.create_x_notification_message()
        return res

    def create_x_notification_message(self):
        try:
            if self.model not in MSG_MODELS:
                return

            NotificationMessage = self.env['x.notification.message']
            for partner in self.partner_ids:
                user = self.env['res.users'].search([('partner_id', '=', partner.id)], limit=1)
                if not user:
                    continue

                values = {
                    'user_id': user.id,
                    'res_model': self.model,
                    'res_id': self.res_id,
                    'summary': self.body,
                }
                NotificationMessage.create(values)
        except Exception as e:
            _logger.error('========== Create Notification Message Error: %s'%str(e))

