'use strict';

const fs = require('fs');

Editor.Panel.extend({
    style: fs.readFileSync(Editor.url('packages://cdn/panel/index.css')),
    template: fs.readFileSync(Editor.url('packages://cdn/panel/index.html')),
    $: {},

    ready() {
        const profile = this.profiles.project;

        this.plugin = new window.Vue({
            el: this.shadowRoot,
            data: {
                remoteUrl: profile.data.remoteUrl
            },
            methods: {
                onUrlChanged() {
                    profile.data.remoteUrl = this.remoteUrl;
                    profile.save();
                }
            }
        });
    },
});