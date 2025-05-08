{
    'name': "Notification",
    'version': '1.0',
    'depends': ['base', 'web', 'mail'],
    'author': 'TinhNN',
    'category': 'Notification',
    'description': """
        Odoo v17
    """,
    'data': [
        'security/ir.model.access.csv',

        'views/x_notification_message_views.xml',

        'data/ir_config_params.xml',
    ],
    'assets': {
        'web.assets_web': [
            'x_notification/static/src/xml/*.xml',
        ],
        'web.assets_backend': [
            'x_notification/static/src/js/*.js',
            'x_notification/static/src/scss/*.scss',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
