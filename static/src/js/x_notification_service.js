/** @odoo-module **/

import { browser } from "@web/core/browser/browser";
import { registry } from "@web/core/registry";

export const XNotificationService = {
    dependencies: ["action", "bus_service", "notification", "rpc"],

    start(env, { action, bus_service, notification, rpc }) {
        bus_service.subscribe("x_notification", (payload) => {
            processXNotification(payload);
        });
        bus_service.start();

        function processXNotification(notifications) {
            console.log(notifications)
            // const x_notification_counter = document.querySelector('#x_notification_counter');
            // x_notification_counter.innerHTML = parseInt(x_notification_counter.innerHTML) + 1;

            // Push new data to local storage
            let storage = JSON.parse(browser.localStorage.getItem('x_notification_data')) || [];
            storage.push(notifications);
            browser.localStorage.setItem('x_notification_data', JSON.stringify(storage));

            // trigger to bus
            env.bus.trigger('x_notification_bus_bus');

        }
    },
};

registry.category("services").add("x_notification", XNotificationService);
