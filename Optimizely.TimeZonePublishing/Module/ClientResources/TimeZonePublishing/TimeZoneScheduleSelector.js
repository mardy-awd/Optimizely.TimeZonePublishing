define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_Widget",
    "epi/shell/widget/_ActionProviderWidget",
    "epi/shell/widget/dialog/_DialogContentMixin",
    "epi/shell/widget/DateTimeSelectorDropDown",
    "epi-cms/widget/Breadcrumb",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory"
], function (
    declare, lang, Widget, ActionProviderWidget, DialogContentMixin,
    DateTimeSelectorDropDown, Breadcrumb, FilteringSelect, Memory
) {

    var PREFERRED = ["Europe/London", "Africa/Cairo", "America/New_York", "Asia/Dubai"];

    function pad(n) { return String(n).padStart(2, "0"); }
    function browserZone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
    function zones() {
        var supported = typeof Intl.supportedValuesOf === "function"
            ? Intl.supportedValuesOf("timeZone") : [];
        return Array.from(new Set(PREFERRED.concat(supported, [browserZone(), "UTC"])));
    }
    function partsAt(date, zone) {
        var result = {};
        new Intl.DateTimeFormat("en-GB", {
            timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hourCycle: "h23"
        }).formatToParts(date).forEach(function (p) {
            if (p.type !== "literal") { result[p.type] = p.value; }
        });
        return result;
    }
    function tomorrowNoon(zone) {
        var p = partsAt(new Date(), zone);
        var next = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + 1));
        return new Date(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), 12, 0, 0, 0);
    }
    function wallTime(date) {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" +
            pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
    }
    function wallToUtc(wall, zone) {
        var bits = wall.split("T"), d = bits[0].split("-").map(Number),
            t = bits[1].split(":").map(Number);
        var naive = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]);
        var matches = [];
        // The enumerated modern IANA zones have quarter-hour offsets.
        for (var offset = -840; offset <= 840; offset += 15) {
            var candidate = new Date(naive - offset * 60000);
            var p = partsAt(candidate, zone);
            if (p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute === wall) {
                matches.push(candidate);
            }
        }
        if (!matches.length) {
            throw new Error("This local time does not exist in the selected time zone (DST transition).");
        }
        if (matches.length > 1) {
            throw new Error("This local time occurs twice in the selected time zone. Choose another time.");
        }
        return matches[0];
    }
    function offsetLabel(date, zone) {
        var part = new Intl.DateTimeFormat("en-US", {
            timeZone: zone, timeZoneName: "longOffset"
        }).formatToParts(date).filter(function (p) { return p.type === "timeZoneName"; })[0];
        var raw = part.value;
        if (raw === "GMT") { return "UTC+00:00"; }
        var m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(raw);
        if (!m) { return raw.replace("GMT", "UTC"); }
        return "UTC" + m[1] + pad(m[2]) + ":" + (m[3] || "00");
    }
    function zoneLabel(date, zone) {
        return "(" + offsetLabel(date, zone) + ") " + zone.replace(/_/g, " ");
    }
    function label(text) {
        var node = document.createElement("label");
        node.textContent = text;
        node.style.display = "block";
        node.style.marginBottom = "2px";
        return node;
    }
    function validDate(value) {
        return value instanceof Date && !isNaN(value.getTime());
    }

    return declare([Widget, ActionProviderWidget, DialogContentMixin], {
        contentLink: null,
        contentData: null,
        contentModel: null,
        selectedZone: null,
        _dateEdited: false,
        _changingDefault: false,
        _updatingLabels: false,
        _ready: false,
        _schedule: null,

        buildRendering: function () {
            this.inherited(arguments);
            this.domNode.className += " epi-padding";
            this.domNode.style.padding = "16px 20px 26px";

            this.selectedZone = browserZone();
            var initial = tomorrowNoon(this.selectedZone);
            var root = this.domNode;

            this.breadcrumb = new Breadcrumb({
                contentLink: this.contentLink,
                showCurrentNode: false
            });
            this.own(this.breadcrumb);
            var heading = document.createElement("h1");
            heading.className = "epi-breadCrumbsCurrentItem dijitInline dojoxEllipsis";
            heading.textContent = (this.contentData && this.contentData.name) ||
                (this.contentModel && this.contentModel.get("epi-icontent_name")) || "";
            heading.style.margin = "0";
            var crumb = document.createElement("div");
            crumb.style.marginBottom = "16px";
            crumb.appendChild(this.breadcrumb.domNode);
            crumb.appendChild(heading);
            root.appendChild(crumb);

            var items = zones().map(function (z) {
                return { id: z, name: zoneLabel(initial, z) };
            });
            items.sort(function (a, b) { return a.name.localeCompare(b.name); });
            this.zoneStore = new Memory({ idProperty: "id", data: items });
            this.zoneSelect = new FilteringSelect({
                store: this.zoneStore,
                searchAttr: "name",
                labelAttr: "name",
                value: this.selectedZone,
                required: true,
                autoComplete: false,
                queryExpr: "*${0}*",
                pageSize: 20,
                style: "width:340px;max-width:100%;"
            });
            this.own(this.zoneSelect);
            root.appendChild(label("Time zone"));
            root.appendChild(this.zoneSelect.domNode);

            var dateArea = document.createElement("div");
            dateArea.style.marginTop = "16px";
            dateArea.appendChild(label("Publish changes on"));
            this.datePicker = new DateTimeSelectorDropDown({ required: true, value: initial });
            this.own(this.datePicker);
            this.datePicker.domNode.style.width = "260px";
            dateArea.appendChild(this.datePicker.domNode);

            this.note = document.createElement("div");
            this.note.setAttribute("role", "status");
            this.note.style.cssText =
                "display:none;margin-top:12px;max-width:450px;" +
                "font-size:13px;line-height:1.5;color:#555";
            dateArea.appendChild(this.note);
            root.appendChild(dateArea);

            this.errorNode = document.createElement("div");
            this.errorNode.setAttribute("role", "alert");
            this.errorNode.style.cssText = "display:none;color:#b42318;margin-top:12px;font-size:13px";
            root.appendChild(this.errorNode);

            var originalOpen = this.datePicker.openDropDown;
            this.datePicker.openDropDown = function () {
                var result = originalOpen.apply(this, arguments);
                if (this.dropDown && this.dropDown.domNode) {
                    var footer = this.dropDown.domNode.querySelector(".epi-timeZoneInfo");
                    if (footer) { footer.style.display = "none"; }
                }
                return result;
            };
        },

        postCreate: function () {
            this.inherited(arguments);
            this.addActions([{
                name: "cancel",
                label: "Cancel",
                settings: { type: "button", "class": "epi-plain-button" },
                action: lang.hitch(this, function () { this.cancelDialog(); })
            },
            {
                name: "save",
                label: "Schedule",
                settings: {
                    type: "button",
                    "class": "Salt"
                },
                action: lang.hitch(this, function () {
                    this._validateAndUpdate();

                    if (!this._schedule) {
                        return;
                    }

                    if (!this.zoneSelect.isValid() ||
                        !this.datePicker.validate()) {
                        return;
                    }

                    this.executeDialog();
                })
            }
            ]);
        },

        startup: function () {
            if (this._started) { return; }
            this.inherited(arguments);
            this.breadcrumb.startup();
            this.zoneSelect.startup();
            this.datePicker.startup();
            this.zoneSelect.set("value", this.selectedZone);

            this.own(this.datePicker.watch("value", lang.hitch(this, function () {
                if (!this._changingDefault) { this._dateEdited = true; }
                this._refresh();
            })));
            this.own(this.zoneSelect.on("change", lang.hitch(this, function (newZone) {
                if (!this._ready || this._updatingLabels || !newZone || newZone === this.selectedZone) {
                    return;
                }
                this.selectedZone = newZone;
                if (!this._dateEdited) {
                    this._changingDefault = true;
                    try { this.datePicker.set("value", tomorrowNoon(newZone)); }
                    finally { this._changingDefault = false; }
                }
                this._refresh();
            })));
            this._ready = true;
            this._refresh();
        },

        _refresh: function () {
            if (!this._ready || this._destroyed) { return; }
            this._updateZoneLabels();
            this._validateAndUpdate();
            this._updateNote();
        },

        _updateZoneLabels: function () {
            var date = this.datePicker.get("value");
            if (!validDate(date)) { return; }
            var instant;
            try { instant = wallToUtc(wallTime(date), this.selectedZone); }
            catch (e) {
                instant = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
            }
            this._updatingLabels = true;
            try {
                this.zoneStore.data.slice().forEach(lang.hitch(this, function (item) {
                    var name = zoneLabel(instant, item.id);
                    if (name !== item.name) { this.zoneStore.put({ id: item.id, name: name }); }
                }));
                var selectedItem = this.zoneStore.get(this.selectedZone);
                if (selectedItem) { this.zoneSelect.set("item", selectedItem); }
            } finally { this._updatingLabels = false; }
        },


        _validateAndUpdate: function () {
            this._schedule = null;
            var message = "";

            try {
                if (!this.zoneSelect.isValid() ||
                    this.zoneSelect.get("value") !== this.selectedZone) {
                    throw new Error("Select a valid time zone from the list.");
                }

                var date = this.datePicker.get("value");

                if (!validDate(date)) {
                    throw new Error("Select a valid publishing date and time.");
                }

                var wall = wallTime(date);
                var utc = wallToUtc(wall, this.selectedZone);

                if (utc.getTime() <= Date.now()) {
                    throw new Error("Publishing time must be in the future.");
                }

                this._schedule = {
                    timeZone: this.selectedZone,
                    localTime: wall,
                    utcDate: utc
                };

            } catch (e) {
                message = e.message;
            }

            var isValid = !!this._schedule;

            this.errorNode.textContent = message;
            this.errorNode.style.display = message ? "block" : "none";

            if (this._actions && this._actions.length) {
                this.setActionProperty(
                    "save",
                    "disabled",
                    !isValid
                );
            }
        },


        _updateNote: function () {
            this.note.textContent = "";
            this.note.style.display = "none";
            if (this.selectedZone === browserZone()) { return; }
            var date = this.datePicker.get("value");
            if (!validDate(date)) { return; }
            try {
                var utc = wallToUtc(wallTime(date), this.selectedZone);
                var formatted = new Intl.DateTimeFormat(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "numeric", minute: "2-digit", timeZoneName: "short"
                }).format(utc);
                var caption = document.createElement("div");
                caption.textContent = "Equivalent in your local time (" + browserZone() + ")";
                var strong = document.createElement("strong");
                strong.textContent = formatted;
                this.note.appendChild(caption);
                this.note.appendChild(strong);
                this.note.style.display = "block";
            } catch (e) {
                // Inline validation is displayed by _validateAndUpdate().
            }
        },

        getValidatedSchedule: function () {
            // Always re-check the time against Date.now() at confirmation.
            this._validateAndUpdate();
            if (!this._schedule) { throw new Error(this.errorNode.textContent || "Invalid publishing time."); }
            return this._schedule;
        }
    });
});
