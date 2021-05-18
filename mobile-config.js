App.info({
  name: 'cookietest',
});

App.appendToConfig(`
<platform name="android">
  <edit-config xmlns:android="http://schemas.android.com/apk/res/android" file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
    <application android:usesCleartextTraffic="true" />
  </edit-config>
</platform>
`);

// use 'gap' to reuse already configured CSP settings in Meteor
App.appendToConfig(`
<allow-intent href="gap:*"/>
<access origin="gap://*"/>
<preference name="scheme" value="gap" />
`);

