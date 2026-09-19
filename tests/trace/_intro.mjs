import pkgResource from '@opentelemetry/resources';
console.log('resource exports:', Object.keys(pkgResource));
console.log('resource type:', typeof pkgResource.Resource, pkgResource.Resource && pkgResource.Resource.name);
console.log('resourceFromAttributes:', typeof pkgResource.resourceFromAttributes);