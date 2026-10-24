
define([
    "dojo/_base/declare",
    "epi/_Module",
    "epi/dependency",
    "epi/shell/command/_CommandProviderMixin",
    "./command/ScheduleInTimeZone"
], function (
    declare,
    Module,
    dependency,
    CommandProviderMixin,
    ScheduleInTimeZone
) {

    var TimeZoneCommandProvider = declare(
        [CommandProviderMixin],
        {
            constructor: function () {
                this.scheduleCommand = new ScheduleInTimeZone();
                this.scheduleCommand.order = 850;

                this.set("commands", []);
            },

            updateCommandModel: function (model) {

                var transitions =
                    model && model.contentData
                        ? model.contentData.transitions || []
                        : [];

                var canSchedule = transitions.some(function (transition) {
                    return transition.name === "scheduleforpublish";
                });

                if (canSchedule) {
                    this.scheduleCommand.set("model", model);
                    this.scheduleCommand.set("canExecute", true);

                    this.set("commands", [
                        this.scheduleCommand
                    ]);
                } else {
                    this.set("commands", []);
                }
            }
        }
    );

    return declare([Module], {

        initialize: function () {
            this.inherited(arguments);

            var registry = dependency.resolve(
                "epi.globalcommandregistry"
            );

            registry.registerProvider(
                "epi.cms.publishmenu",
                new TimeZoneCommandProvider()
            );

            console.log(
                "TimeZonePublishing command provider registered"
            );
        }

    });

});
