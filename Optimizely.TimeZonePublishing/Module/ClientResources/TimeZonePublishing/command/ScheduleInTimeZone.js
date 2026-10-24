define([
    "dojo/_base/declare",
    "epi-cms/contentediting/command/_ChangeContentStatus",
    "epi/shell/DialogService",
    "../TimeZoneScheduleSelector"
], function (declare, ChangeContentStatus, dialogService, TimeZoneScheduleSelector) {
    "use strict";

    return declare([ChangeContentStatus], {
        label: "Schedule Publish by Time Zone",
        iconClass: "epi-iconWebsite",

        _execute: function () {
            var command = this;
            var selector = new TimeZoneScheduleSelector({
                contentLink: this.model.contentLink,
                contentData: this.model.contentData,
                contentModel: this.model.contentModel
            });

            return dialogService.dialog({
                title: "Schedule Publish by Time Zone",
                content: selector,
                defaultActionsVisible: false
            }).then(function () {
                // The dialog only resolves on selector.executeDialog().
                // Validate again before the server request.
                var schedule = selector.getValidatedSchedule();
                return command.model.scheduleForPublish(schedule.utcDate)
                    .then(command._onContentStatusChange.bind(command));
            });
        }
    });
});
