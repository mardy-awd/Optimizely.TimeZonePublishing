
using EPiServer.Framework;
using EPiServer.Framework.Initialization;
using EPiServer.ServiceLocation;
using EPiServer.Shell.Modules;
using Microsoft.Extensions.DependencyInjection;

namespace Optimizely.TimeZonePublishing;

[InitializableModule]
public class TimeZonePublishingInitialization : IConfigurableModule
{
    public void ConfigureContainer(ServiceConfigurationContext context)
    {
        context.Services.Configure<ProtectedModuleOptions>(options =>
        {
            if (!options.Items.Any(x => x.Name == "TimeZonePublishing"))
            {
                options.Items.Add(new ModuleDetails
                {
                    Name = "TimeZonePublishing"
                });
            }
        });
    }

    public void Initialize(InitializationEngine context)
    {
    }

    public void Uninitialize(InitializationEngine context)
    {
    }
}