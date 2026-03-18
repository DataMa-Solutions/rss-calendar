//Répertori des évènements d'actualités sur des plages 1h dans un google calendar à partir de flux RSS

function updateTravelCalendar() {
  var calendar = CalendarApp.getCalendarById("yanling@datama.io");

  var rssFeeds = [
    "https://www.lefigaro.fr/rss/figaro_voyages.xml",
    "https://www.tourmag.com/xml/syndication.rss",
    "https://www.liberation.fr/arc/outboundfeeds/rss/category/economie-transport/"
  ];
  
  var keywords = ["grève", "annulation", "retard"];

  rssFeeds.forEach(function(feedUrl) {
    try {
      var response = UrlFetchApp.fetch(feedUrl, {muteHttpExceptions: true});
      if (response.getResponseCode() !== 200) {
        Logger.log("❌ Erreur : Impossible de récupérer le flux RSS : " + feedUrl);
        return;
      }
      
      var xml = XmlService.parse(response.getContentText());
      var items = xml.getRootElement().getChild("channel").getChildren("item");

      items.forEach(function(item) {
        var title = item.getChildText("title");
        var link = item.getChildText("link");
        var pubDate = new Date(item.getChildText("pubDate"));
        var description = item.getChildText("description");

        if (keywords.some(keyword => title.toLowerCase().includes(keyword))) {
          if (!eventExists(calendar, title)) {
            addEvent(calendar, title, pubDate, description, link);
          }
        }
      });
    } catch (e) {
      Logger.log("⚠️ Erreur lors du traitement du flux RSS : " + feedUrl + " - " + e.toString());
    }
  });
}

function eventExists(calendar, title) {
  var events = calendar.getEvents(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()); //récupère les évènements sur les 30 derniers jours
  return events.some(event => event.getTitle() === title);
}

function addEvent(calendar, title, startTime, description, link) {
  var endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Événement d'une heure
  calendar.createEvent(title, startTime, endTime, { description: description + "\n" + link });
  Logger.log("✅ Événement ajouté : " + title);
}

function createHourlyTrigger() {
  // Supprime les triggers existants pour éviter les doublons
  var triggers = ScriptApp.getProjectTriggers();
  
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "updateTravelCalendar") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Crée un nouveau trigger toutes les heures
  ScriptApp.newTrigger("updateTravelCalendar")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("⏰ Trigger horaire créé pour updateTravelCalendar()");
}