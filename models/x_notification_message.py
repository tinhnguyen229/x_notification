import logging
import pytz
from datetime import datetime, timedelta

from odoo import models, api, fields
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT

_logger = logging.getLogger(__name__)


class XNotificationMessage(models.Model):
    _name = 'x.notification.message'
    _description = 'Notification message'

    user_id = fields.Many2one('res.users', string='User')
    res_model = fields.Char('Res Model Name')
    res_id = fields.Many2oneReference(string='Res ID', model_field='res_model')
    res_name = fields.Char(
        'Res Name', compute='_compute_res_name', compute_sudo=True, store=True,
        help="Display name of the related document.")
    summary = fields.Text('Summary')
    is_seen = fields.Boolean(string="Is seen?", default=False)

    @api.depends('res_model', 'res_id')
    def _compute_res_name(self):
        for r in self:
            r.res_name = r.res_model and self.env[r.res_model].browse(r.res_id).display_name

    @api.model
    def create(self, vals):
        res = super(XNotificationMessage, self).create(vals)
        res.push_notification()
        return res

    @api.model
    def get_user_notifications(self):
        _logger.info(f'[X Notification][{self.env.user.login}] PROCESSING == Đang lấy dữ liệu thông báo\n\n\n')

        ICP = int(self.env['ir.config_parameter'].sudo().get_param('x_notification_day_limit', 3))
        furthest_date = (datetime.now() - timedelta(days=ICP)).strftime(DEFAULT_SERVER_DATETIME_FORMAT)
        message = self.search(
            [('user_id', '=', self.env.user.id), '|', ('create_date', '>=', furthest_date), ('is_seen', '=', False)],
            order='id desc')
        datas = []
        for msg in message:
            datas.append(msg.get_notification_data())
        _logger.info('[X Notification] SUCCESSFULLY == Lấy dữ liệu thông báo thành công')
        return datas

    def push_notification(self):
        try:
            noti_data = self.get_notification_data()
            self.push_notification_to_gui(self.user_id.partner_id.ids, noti_data)
        except Exception as e:
            _logger.error(msg='========== Error pushing notification ==========:\n\n%s' % str(e))

    def get_notification_data(self):
        noti_data = {
            'title': self.res_name,
            'body': self.summary,
            'res_model': self.res_model,
            'res_id': self.res_id,
            'msg_id': self.id,
            'is_seen': self.is_seen,
            'date': self.convert_tz_utc2local(self.create_date),
        }
        return noti_data

    @api.model
    def push_notification_to_gui(self, partner_ids=[], vals={}):
        partner_ids = self.env['res.partner'].sudo().browse(partner_ids)
        for partner_id in partner_ids:
            self.env['bus.bus']._sendone(partner_id, 'x_notification', {
                'title': vals.get('title'),
                'body': vals.get('body'),
                'res_model': vals.get('res_model'),
                'res_id': vals.get('res_id'),
                'msg_id': vals.get('msg_id'),
                'is_seen': vals.get('is_seen', False),
                'date': vals.get('date'),
            })


    @api.model
    def convert_tz_utc2local(self, utctime):
        """ Convert UTC to Local Time
        :param utctime: datetime obj
        :return: datetime obj
        """
        if type(utctime) is str:
            utctime = fields.Datetime.from_string(utctime)

        user_tz = self.env.user.tz or pytz.utc
        user_tz = pytz.timezone(user_tz)
        result = pytz.utc.localize(utctime).astimezone(user_tz).replace(tzinfo=None)
        return result