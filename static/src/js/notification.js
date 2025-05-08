/* @odoo-module */

import { Component, useState, markup, onWillStart } from '@odoo/owl';
import { Dropdown } from '@web/core/dropdown/dropdown';
import { registry } from '@web/core/registry';
import { useService, useBus } from '@web/core/utils/hooks';
import { browser } from "@web/core/browser/browser";

export class NotificationMenu extends Component {
    static components = { Dropdown };
    static props = [];
    static template = 'x_notification.NotificationMenu';

    setup() {
        super.setup();
        this.state = useState({
            datas: [],
            current_tab_datas: [],
            counter: 0,
        });
        this.actionService = useService('action');
        this.orm = useService('orm');
        this.userId = useService('user').userId;
        this.ui = useState(useService('ui'));
        this.localStorage = browser.localStorage;
        useBus(this.env.bus, "x_notification_bus_bus", this.x_notification_bus_bus);
        onWillStart(async () => {
            console.log('on will start');
            await this.initialDataWhenReload();
        })
    }

    x_notification_bus_bus() {
        console.log('Test Bus Tinhnn')
        this.updateCounter();
    }

    async initialDataWhenReload() {
        await this.fetchSystrayNotifications();
        this.updateCounter();
    }

    updateCounter() {
        let data = this.getDataFromLocalStorage();
        this.state.counter = data.reduce(function(total, item, index) {
            if (!item.is_seen) return total + 1;
            return total;
        }, 0);
    }

    async fetchSystrayNotifications() {
        let datas = [];
        try {
            datas = await this.orm.call('x.notification.message', 'get_user_notifications');
        } catch {
            console.log('=====>>> Error! Check fetch notification....')
        }
        this.pushDataToLocalStorage(datas);
    }

    async onBeforeOpen() {
        let data = this.getDataFromLocalStorage();
        if (data.length === 0) {
            await this.fetchSystrayNotifications();
            this.state.datas = this.getDataFromLocalStorage();
        } else {
            this.state.datas = data;
        }
        this.state.current_tab_datas = this.sortNotification(this.state.datas);
        this.env.bus.trigger('x_notification')
    }

    sortNotification(data) {
        // Order by is_seen=false -> date desc
        data.sort((a, b) => {
          if (a.is_seen !== b.is_seen) {
            return a.is_seen ? 1 : -1; // if a=true, a should come after b
          }
          return new Date(b.date) - new Date(a.date); // if a.date is greater than b.date (b.date-a.date is negative ), a come before b
        });
        return data;
    }

    getMarkupValue(html_str) {
        return markup(html_str);
    }

    pushDataToLocalStorage(data) {
        this.localStorage.setItem('x_notification_data', JSON.stringify(data))
    }

    getDataFromLocalStorage() {
        let data = this.localStorage.getItem('x_notification_data');
        return JSON.parse(data) || [];
    }

    filterAllNotification(e, tab_name) {
        let activeElement = Array.from(this.usingQuerySelectorAll('.tab.active'));
        activeElement.forEach(element => element.classList.remove('active'));

        let element = e.srcElement;
        element.classList.add("active");

        let model_names = []
        if (tab_name === 'project_tab') {
            model_names = ['project.project', 'project.task']
        } else if (tab_name === 'hr_tab') {
            model_names = ['hr.leave']
        } else if (tab_name === 'sale_tab') {
            model_names = ['sale.order']
        } else if (tab_name === 'crm_tab') {
            model_names = ['crm.lead']
        } else if (tab_name === 'approval_tab') {
            model_names = ['approval.request']
        }

        this.state.current_tab_datas = this.state.datas.filter(
            (item, index) => model_names.includes(item.res_model) || model_names.length === 0
        )
    }

    async openNotification(msg_id, res_model, res_id, is_seen) {
        // Auto close Popup when click Noti
        document.body.click();

        // Set is_seen = true in local_storage and database
        if (!is_seen) {
            await this.setIsSeenNotification([msg_id], false);
        }

        // Go to form view of noti object
        await this.actionService.doAction({
            type: "ir.actions.act_window",
            views: [[false, "form"]],
            view_mode: "form",
            target: 'current',
            res_model: res_model,
            res_id: res_id,
        });
    }

    async markReadAll() {
        let not_seen_msg = this.state.current_tab_datas.filter((item, index) => !item.is_seen)
        if (not_seen_msg.length !== 0) {
            await this.setIsSeenNotification([], not_seen_msg);
        }
    }

    async setIsSeenNotification(msg_ids=[], datas=false) {
        if (msg_ids.length !== 0) {
            datas = this.state.current_tab_datas.filter((item, index) => {
                return msg_ids.includes(item.msg_id)
            });
        }
        datas.forEach((item, index) => {
            item.is_seen = true;
            msg_ids.push(item.msg_id);
        })
        if (msg_ids.length !== 0) {
            this.pushDataToLocalStorage(this.state.datas);
            await this.orm.write('x.notification.message', msg_ids, { is_seen: true });
        }
        this.updateCounter();
    }

    usingQuerySelectorAll(selector) {
        let notificationElement = document.querySelector('.x_notification');
        let elements = notificationElement.querySelectorAll(selector);
        return elements;
    }
}

registry.category('systray').add(
    'x_notification.notification_menu',
    { Component: NotificationMenu },
    { sequence: 20 }
);
