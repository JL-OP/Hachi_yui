

/* =====================================================================
   1. SETTINGS
   ===================================================================== */

var OPEN_TIME = 13 * 60;      // 1:00 PM
var CLOSE_TIME = 21 * 60;     // 9:00 PM
var CLEANING_GAP = 30;        // minutes of cleaning after each session
var ARRIVE_EARLY = 15;        // customers arrive 15 minutes early
var SLOT_STEP = 30;           // a session can start every 30 minutes

var PAGES = ['home', 'about', 'services', 'gallery', 'visit', 'book'];   // the customer pages, in order
var STEP_NAMES = ['Service', 'Date & Time', 'Room', 'Health', 'Details', 'Review'];

var DB_KEY = 'spa_database_v2';             // where the database is saved in the browser
var LOGIN_KEY = 'spa_logged_in_user_id';    // who is logged in (admin page)

// Extra text for each service (the ERD does not store these, so we keep them here)
var SERVICE_FEATURES = {
  SR: ['Private single treatment room', 'Dedicated therapist', 'Good for 1 person'],
  CS: ['Complimentary herbal tea', 'Private room access for two', 'Good for 2 persons'],
  FL: ['Good for up to 4 persons (max 6)', '+₱750 per extra person (5th–6th)', 'Private lounge experience']
};


/* =====================================================================
   2. DATABASE
   Your ERD has 11 tables. We create the same 11 tables here.
   Each table is a list (array) of rows. A row is an object like:
        { customer_id: 1, full_name: 'Ana', email: 'ana@mail.com', ... }
   "PK" (primary key) = the unique id of a row.
   "FK" (foreign key)  = a field that holds the id of a row in another table.
        Example: appointment.customer_id points to customer.customer_id
   ===================================================================== */

// table name -> name of its primary key field  (null = the key is made of two fields)
var PRIMARY_KEYS = {
  customer: 'customer_id',
  user: 'user_id',
  service: 'service_id',
  room: 'room_id',
  appointment: 'appointment_id',
  appointment_guest: 'guest_id',
  therapist: 'therapist_id',
  appointment_therapist: null,          // PK = appointment_id + therapist_id
  health_declaration: 'declaration_id',
  payment: 'payment_id',
  cleaning_task: 'cleaning_id'
};

// The relationships of the ERD, written in plain words (shown in the admin Database tab)
var ERD_LINES = [
  'CUSTOMER 1 → many APPOINTMENT  (a customer books appointments)',
  'SERVICE 1 → many APPOINTMENT  (a service is selected for appointments)',
  'ROOM 1 → many APPOINTMENT  (a room hosts appointments)',
  'USER 1 → many APPOINTMENT  (a staff user manages appointments: managed_by)',
  'APPOINTMENT 1 → many APPOINTMENT_GUEST  (an appointment includes guests)',
  'APPOINTMENT ↔ THERAPIST  many-to-many through APPOINTMENT_THERAPIST',
  'APPOINTMENT 1 → 0..1 HEALTH_DECLARATION',
  'APPOINTMENT 1 → many PAYMENT  (and USER 1 → many PAYMENT: recorded_by)',
  'APPOINTMENT 1 → 0..1 CLEANING_TASK  (and ROOM 1 → many CLEANING_TASK)'
];

var db = null;      // the whole database lives in this variable

// ----- Load / save -----

function createEmptyDatabase() {
  var empty = { _counters: {} };            // _counters remembers the last id of each table
  for (var table in PRIMARY_KEYS) {
    empty[table] = [];
  }
  return empty;
}

function saveDatabase() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function loadDatabase() {
  var text = localStorage.getItem(DB_KEY);
  if (text) {
    try {
      db = JSON.parse(text);
      return;
    } catch (error) {
      // the saved text was broken -> start again below
    }
  }
  db = createEmptyDatabase();
  seedDatabase();                           // fill the starter data
}

// ----- Basic row tools (like simple SQL commands) -----

// INSERT: add a row. The primary key is created automatically (1, 2, 3 ...)
function insertRow(table, row) {
  var pk = PRIMARY_KEYS[table];
  if (pk) {
    db._counters[table] = (db._counters[table] || 0) + 1;
    row[pk] = db._counters[table];
  }
  db[table].push(row);
  saveDatabase();
  return row;
}

// SELECT one row by its id
function findById(table, id) {
  var pk = PRIMARY_KEYS[table];
  var rows = db[table];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][pk] === id) {
      return rows[i];
    }
  }
  return null;
}

// SELECT many rows. testFunction(row) must return true for the rows you want
function findRows(table, testFunction) {
  var result = [];
  var rows = db[table];
  for (var i = 0; i < rows.length; i++) {
    if (testFunction(rows[i])) {
      result.push(rows[i]);
    }
  }
  return result;
}

// UPDATE: change fields of one row
function updateRow(table, id, changes) {
  var row = findById(table, id);
  if (!row) return;
  for (var field in changes) {
    row[field] = changes[field];
  }
  saveDatabase();
}

// DELETE rows
function deleteRows(table, testFunction) {
  db[table] = db[table].filter(function (row) {
    return !testFunction(row);
  });
  saveDatabase();
}

// ----- Starter data (created only the first time) -----

// A tiny "scrambler" for passwords. For practice only — real websites hash on a server.
function simpleHash(text) {
  var hash = 5381;
  for (var i = 0; i < text.length; i++) {
    hash = (hash * 33 + text.charCodeAt(i)) % 4294967296;
  }
  return 'demo$' + hash.toString(16);
}

function nowIso() {
  return new Date().toISOString();
}

function seedDatabase() {
  // USER table: the staff accounts (role is 'manager' or 'front_desk')
  insertRow('user', { full_name: 'Spa Manager', username: 'admin', email: 'admin@bellavista.test', password_hash: simpleHash('bella2026'), role: 'manager', is_active: true, created_at: nowIso() });
  insertRow('user', { full_name: 'Front Desk Staff', username: 'frontdesk', email: 'frontdesk@bellavista.test', password_hash: simpleHash('front2026'), role: 'front_desk', is_active: true, created_at: nowIso() });

  // SERVICE table
  insertRow('service', { service_code: 'SR', service_name: 'Single Room Massage', duration_minutes: 60, base_price: 800, base_capacity: 1, max_capacity: 1, extra_person_fee: 0, is_active: true });
  insertRow('service', { service_code: 'CS', service_name: 'Couples Suite', duration_minutes: 60, base_price: 1800, base_capacity: 2, max_capacity: 2, extra_person_fee: 0, is_active: true });
  insertRow('service', { service_code: 'FL', service_name: 'Barkada / Family Spa Lounge', duration_minutes: 90, base_price: 4000, base_capacity: 4, max_capacity: 6, extra_person_fee: 750, is_active: true });

  // ROOM table (room_type matches the service_code of the service it is used for)
  var rooms = [
    ['SR-1', 'Single Room 1', 'SR'], ['SR-2', 'Single Room 2', 'SR'], ['SR-3', 'Single Room 3', 'SR'],
    ['CS-1', 'Couples Suite 1', 'CS'], ['CS-2', 'Couples Suite 2', 'CS'],
    ['FL-1', 'Family Lounge 1', 'FL'], ['FL-2', 'Family Lounge 2', 'FL']
  ];
  for (var i = 0; i < rooms.length; i++) {
    insertRow('room', { room_code: rooms[i][0], room_name: rooms[i][1], room_type: rooms[i][2], is_active: true });
  }

  // THERAPIST table
  var therapists = ['Maya Santos', 'Liza Reyes', 'Ramon Cruz', 'Joy Mendoza', 'Ana Villanueva', 'Carlo Dizon'];
  for (var t = 0; t < therapists.length; t++) {
    insertRow('therapist', { full_name: therapists[t], phone: '0917 100 00' + (10 + t), is_active: true });
  }
}


/* =====================================================================
   3. HELPER FUNCTIONS
   ===================================================================== */

function byId(id) {
  return document.getElementById(id);
}

// pad(5) -> "05"      pad(7, 5) -> "00007"
function pad(number, length) {
  var text = '' + number;
  while (text.length < (length || 2)) {
    text = '0' + text;
  }
  return text;
}

// 810 -> "1:30 PM"
function formatTime(totalMinutes) {
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  var ampm = (hours >= 12) ? 'PM' : 'AM';
  var hours12 = hours % 12;
  if (hours12 === 0) hours12 = 12;
  return hours12 + ':' + pad(minutes) + ' ' + ampm;
}

// 1800 -> "₱1,800"
function formatPeso(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH');
}

// "13:30" -> 810
function timeToMinutes(text) {
  var parts = text.split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

// Date object -> "2026-11-08"
function dateToText(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function getTodayText() {
  return dateToText(new Date());
}

function getNowMinutes() {
  var now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// "2026-11-08" -> "Sunday, November 8, 2026"
function prettyDate(text) {
  var parts = text.split('-');
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// "2026-11-08" + 810  ->  "2026-11-08T13:30"   (this is what start_at / end_at store)
function makeDateTime(dateText, minutes) {
  return dateText + 'T' + pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
}

// Make text safe to put inside HTML
function safeText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "1.5 HOURS"
function durationText(minutes) {
  var hours = minutes / 60;
  if (hours === 1) return '1 HOUR';
  return hours + ' HOURS';
}

// ----- Read data of an appointment (these follow the ERD arrows) -----

function apptDate(a) { return a.start_at.slice(0, 10); }
function apptStart(a) { return timeToMinutes(a.start_at.slice(11, 16)); }
function apptEnd(a) { return timeToMinutes(a.end_at.slice(11, 16)); }
function apptCode(a) { return 'APT-' + pad(a.appointment_id, 5); }

function getCustomer(a) { return findById('customer', a.customer_id); }
function getService(a) { return findById('service', a.service_id); }
function getRoom(a) { return findById('room', a.room_id); }
function getManager(a) { return a.managed_by ? findById('user', a.managed_by) : null; }

function getGuests(a) {
  return findRows('appointment_guest', function (g) { return g.appointment_id === a.appointment_id; });
}
function getHealth(a) {
  var rows = findRows('health_declaration', function (h) { return h.appointment_id === a.appointment_id; });
  return rows.length > 0 ? rows[0] : null;
}
function getPayments(a) {
  return findRows('payment', function (p) { return p.appointment_id === a.appointment_id; });
}
function getCleaningTask(a) {
  var rows = findRows('cleaning_task', function (c) { return c.appointment_id === a.appointment_id; });
  return rows.length > 0 ? rows[0] : null;
}

// Therapists assigned to an appointment (goes through the APPOINTMENT_THERAPIST table)
function getTherapistsOf(a) {
  var links = findRows('appointment_therapist', function (l) { return l.appointment_id === a.appointment_id; });
  var result = [];
  for (var i = 0; i < links.length; i++) {
    var therapist = findById('therapist', links[i].therapist_id);
    if (therapist) result.push(therapist);
  }
  return result;
}

// Money that was really paid (payments with status 'paid')
function getPaidAmount(a) {
  var total = 0;
  var payments = getPayments(a);
  for (var i = 0; i < payments.length; i++) {
    if (payments[i].payment_status === 'paid') total += payments[i].amount;
  }
  return total;
}


/* =====================================================================
   4. BOOKING RULES
   ===================================================================== */

// base price + extra fee for every guest above the base capacity
function calculatePrice(service, guests) {
  var extraGuests = guests - service.base_capacity;
  if (extraGuests < 0) extraGuests = 0;
  return service.base_price + extraGuests * service.extra_person_fee;
}

// Rooms that belong to a service (match room_type with service_code)
function getRoomsOfService(service) {
  return findRows('room', function (r) {
    return r.room_type === service.service_code && r.is_active;
  });
}

// Is this room free? A session blocks the room until its end + 30 min cleaning.
function isRoomFree(roomId, date, start, minutes, ignoreAppointmentId) {
  var newBlockedUntil = start + minutes + CLEANING_GAP;
  var appointments = db.appointment;

  for (var i = 0; i < appointments.length; i++) {
    var a = appointments[i];
    if (a.status === 'cancelled') continue;
    if (a.room_id !== roomId) continue;
    if (apptDate(a) !== date) continue;
    if (a.appointment_id === ignoreAppointmentId) continue;

    var oldBlockedUntil = apptEnd(a) + CLEANING_GAP;
    if (start < oldBlockedUntil && apptStart(a) < newBlockedUntil) {
      return false;
    }
  }
  return true;
}

// List of time slots for a service on a date.
// Each slot: { start: 780, freeRoomIds: [1,2], isPast: false }
function getTimeSlots(service, date) {
  var rooms = getRoomsOfService(service);
  var slots = [];

  for (var start = OPEN_TIME; start + service.duration_minutes <= CLOSE_TIME; start += SLOT_STEP) {
    var freeRoomIds = [];
    for (var i = 0; i < rooms.length; i++) {
      if (isRoomFree(rooms[i].room_id, date, start, service.duration_minutes, null)) {
        freeRoomIds.push(rooms[i].room_id);
      }
    }

    var isPast = false;
    if (date < getTodayText()) {
      isPast = true;
    } else if (date === getTodayText() && start < getNowMinutes() + ARRIVE_EARLY) {
      isPast = true;
    }
    slots.push({ start: start, freeRoomIds: freeRoomIds, isPast: isPast });
  }
  return slots;
}

// Is this therapist already working at that time?
function isTherapistBusy(therapistId, date, start, minutes, ignoreAppointmentId) {
  var links = findRows('appointment_therapist', function (l) { return l.therapist_id === therapistId; });
  for (var i = 0; i < links.length; i++) {
    var a = findById('appointment', links[i].appointment_id);
    if (!a) continue;
    if (a.status === 'cancelled') continue;
    if (a.appointment_id === ignoreAppointmentId) continue;
    if (apptDate(a) !== date) continue;
    if (start < apptEnd(a) && apptStart(a) < start + minutes) {
      return true;
    }
  }
  return false;
}

// 'cancelled', 'booked' (upcoming), 'active', 'cleaning' or 'done'
function getAppointmentStatus(a) {
  if (a.status === 'cancelled') return 'cancelled';

  var date = apptDate(a);
  var today = getTodayText();
  if (date < today) return 'done';
  if (date > today) return 'booked';

  var now = getNowMinutes();
  var start = apptStart(a);
  var end = apptEnd(a);
  if (now < start) return 'booked';
  if (now < end) return 'active';

  var task = getCleaningTask(a);
  var cleaned = (task && task.status === 'done');
  if (now < end + CLEANING_GAP && !cleaned) return 'cleaning';
  return 'done';
}

// ----- Create a full appointment: this fills SEVERAL tables at once -----
// info = { fullName, email, phone, serviceId, roomId, date, start, guestNames, healthItems, notes }
function createAppointment(info) {
  var service = findById('service', info.serviceId);
  var email = info.email.trim().toLowerCase();

  // 1) CUSTOMER: reuse the customer if the email already exists (email is unique)
  var customer = findRows('customer', function (c) { return c.email === email; })[0];
  if (customer) {
    updateRow('customer', customer.customer_id, { full_name: info.fullName, phone: info.phone });
  } else {
    customer = insertRow('customer', { full_name: info.fullName, email: email, phone: info.phone, created_at: nowIso() });
  }

  // 2) APPOINTMENT (points to the customer, service and room with foreign keys)
  var guestCount = info.guestNames.length;
  var appointment = insertRow('appointment', {
    customer_id: customer.customer_id,
    service_id: service.service_id,
    room_id: info.roomId,
    managed_by: null,                                          // a staff user is set later
    start_at: makeDateTime(info.date, info.start),
    end_at: makeDateTime(info.date, info.start + service.duration_minutes),
    guest_count: guestCount,
    total_amount: calculatePrice(service, guestCount),
    status: 'confirmed',
    created_at: nowIso()
  });

  // 3) APPOINTMENT_GUEST: one row per guest
  for (var i = 0; i < info.guestNames.length; i++) {
    insertRow('appointment_guest', { appointment_id: appointment.appointment_id, guest_name: info.guestNames[i] });
  }

  // 4) HEALTH_DECLARATION
  var items = info.healthItems;
  var hasMedical = items.indexOf('Heart / blood pressure condition') !== -1 ||
                   items.indexOf('Skin condition / allergies') !== -1 ||
                   items.indexOf('Other medical condition') !== -1;
  var details = items.join(', ');
  if (info.notes) details += ' — Notes: ' + info.notes;
  insertRow('health_declaration', {
    appointment_id: appointment.appointment_id,
    has_medical_condition: hasMedical,
    has_injury: items.indexOf('Recent injury / surgery') !== -1,
    is_pregnant: items.indexOf('Pregnancy') !== -1,
    details: details,
    submitted_at: nowIso()
  });

  // 5) CLEANING_TASK: the room must be cleaned right after the session
  var end = info.start + service.duration_minutes;
  insertRow('cleaning_task', {
    appointment_id: appointment.appointment_id,
    room_id: info.roomId,
    scheduled_start: makeDateTime(info.date, end),
    scheduled_end: makeDateTime(info.date, end + CLEANING_GAP),
    status: 'scheduled'
  });

  return appointment;
}

// Fake appointments so the admin pages have something to show
function addSampleAppointments(date) {
  // [room code, start minutes, guest names, customer name, customer email]
  var samples = [
    ['SR-1', 780, ['Isabel Cruz'], 'Isabel Cruz', 'isabel@example.com'],
    ['SR-2', 840, ['Marco Reyes'], 'Marco Reyes', 'marco@example.com'],
    ['SR-3', 810, ['Jenny Lim'], 'Jenny Lim', 'jenny@example.com'],
    ['SR-1', 900, ['Noel Bautista'], 'Noel Bautista', 'noel@example.com'],
    ['CS-1', 780, ['Katrina Uy', 'Paolo Uy'], 'Katrina Uy', 'katrina@example.com'],
    ['CS-2', 960, ['Rica Tan', 'Leo Tan'], 'Rica Tan', 'rica@example.com'],
    ['FL-1', 810, ['Ben Dela Rosa', 'Mia Dela Rosa', 'Ana Dela Rosa', 'Rey Dela Rosa', 'Tita Dela Rosa'], 'Ben Dela Rosa', 'ben@example.com'],
    ['FL-2', 1020, ['Gabo', 'Pia', 'Jun', 'Ella'], 'Gabo Santos', 'gabo@example.com'],
    ['SR-2', 1080, ['Sofia Tan'], 'Sofia Tan', 'sofia@example.com'],
    ['CS-1', 1020, ['Lara Go', 'Ivan Go'], 'Lara Go', 'lara@example.com']
  ];
  var firstUser = db.user[0];

  for (var i = 0; i < samples.length; i++) {
    var room = findRows('room', function (r) { return r.room_code === samples[i][0]; })[0];
    var service = findRows('service', function (s) { return s.service_code === room.room_type; })[0];
    var start = samples[i][1];

    if (start + service.duration_minutes > CLOSE_TIME) continue;
    if (!isRoomFree(room.room_id, date, start, service.duration_minutes, null)) continue;

    var appointment = createAppointment({
      fullName: samples[i][3], email: samples[i][4], phone: '0917 000 000' + i,
      serviceId: service.service_id, roomId: room.room_id, date: date, start: start,
      guestNames: samples[i][2], healthItems: ['None to declare'], notes: ''
    });

    // every 3rd appointment gets a therapist
    if (i % 3 === 0) {
      var therapist = db.therapist[i % db.therapist.length];
      insertRow('appointment_therapist', { appointment_id: appointment.appointment_id, therapist_id: therapist.therapist_id });
    }
    // every 2nd appointment is already paid
    if (i % 2 === 0) {
      insertRow('payment', { appointment_id: appointment.appointment_id, recorded_by: firstUser.user_id, amount: appointment.total_amount, payment_method: 'cash', payment_status: 'paid', paid_at: nowIso() });
      updateRow('appointment', appointment.appointment_id, { managed_by: firstUser.user_id });
    }
  }
}


/* =====================================================================
   5. PAGE SWITCHING
   index.html#home ... index.html#book  -> customer pages (one at a time)
   index.html#admin                      -> admin page
   ===================================================================== */

function showCorrectPage() {
  var name = location.hash.replace('#', '');

  // ----- admin page -----
  if (name === 'admin') {
    byId('website').style.display = 'none';
    byId('adminPage').style.display = '';
    checkLogin();
    return;
  }

  // ----- customer pages -----
  byId('adminPage').style.display = 'none';
  byId('website').style.display = '';
  if (PAGES.indexOf(name) === -1) {
    name = 'home';                              // unknown address -> home
  }

  // show only the chosen page
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.remove('active');
  }
  byId('page-' + name).classList.add('active');
  byId('page-' + name).scrollTop = 0;

  // highlight the matching menu link
  var links = document.querySelectorAll('#menu a');
  for (var j = 0; j < links.length; j++) {
    if (links[j].getAttribute('data-page') === name) {
      links[j].classList.add('current');
    } else {
      links[j].classList.remove('current');
    }
  }
  byId('menu').classList.remove('open');

  if (name === 'book') {
    redrawBooking();                            // refresh free rooms every time we open the booking page
  }
}

// Left / Right arrow keys flip through the pages
function handleArrowKeys(event) {
  var tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (location.hash === '#admin') return;
  if (document.querySelector('.modal.open')) return;

  var current = location.hash.replace('#', '');
  var index = PAGES.indexOf(current);
  if (index === -1) index = 0;

  if (event.key === 'ArrowRight' && index < PAGES.length - 1) {
    location.hash = '#' + PAGES[index + 1];
  } else if (event.key === 'ArrowLeft' && index > 0) {
    location.hash = '#' + PAGES[index - 1];
  }
}


/* =====================================================================
   6. CUSTOMER BOOKING WIZARD
   ===================================================================== */

// What the customer has chosen so far
var currentStep = 1;
var selectedService = null;       // a row of the SERVICE table
var selectedDate = getTodayText();
var guestNumber = 1;
var selectedSlot = null;          // start time in minutes
var selectedRoomId = null;        // room_id
var guestNames = [];              // names typed in step 5
var currentSlots = [];

// Smallest number of guests allowed for a service
function getMinGuests(service) {
  if (service.base_capacity < 2) return service.base_capacity;
  return 2;
}

// ---------- Services (page 3 and wizard step 1) ----------

function getActiveServices() {
  return findRows('service', function (s) { return s.is_active; });
}

function describeCapacity(service) {
  if (service.base_capacity === service.max_capacity) {
    return 'Good for ' + service.max_capacity + (service.max_capacity === 1 ? ' person' : ' persons');
  }
  return 'Up to ' + service.base_capacity + ' (max ' + service.max_capacity + ') persons';
}

function drawServiceCards() {
  var services = getActiveServices();

  // ----- big cards on the Services page -----
  var html = '';
  for (var i = 0; i < services.length; i++) {
    var s = services[i];
    var roomCodes = [];
    var rooms = getRoomsOfService(s);
    for (var r = 0; r < rooms.length; r++) roomCodes.push(rooms[r].room_code);

    html += '<article class="glass svc">' +
      '<div class="code">' + roomCodes.join(' · ') + '</div>' +
      '<h3>' + s.service_name + '</h3>' +
      '<div class="price">' + formatPeso(s.base_price) + ' <small>/ ' + durationText(s.duration_minutes) + '</small></div>' +
      '<ul>';
    var features = SERVICE_FEATURES[s.service_code] || [];
    for (var f = 0; f < features.length; f++) {
      html += '<li>' + features[f] + '</li>';
    }
    html += '</ul><button type="button" class="btn" data-service="' + s.service_code + '">Book this</button></article>';
  }
  byId('serviceCards').innerHTML = html;

  // clicking "Book this" picks the service and opens the booking page
  var buttons = document.querySelectorAll('#serviceCards [data-service]');
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].onclick = function () {
      chooseService(this.getAttribute('data-service'));
      currentStep = 2;                        // service is chosen, so start at "Date & Time"
      location.hash = '#book';
    };
  }
}

// ---------- Wizard step 1: service choices ----------
function drawServiceChoices() {
  var services = getActiveServices();
  var html = '';
  for (var i = 0; i < services.length; i++) {
    var s = services[i];
    var selected = (selectedService && selectedService.service_id === s.service_id) ? ' sel' : '';
    html += '<button type="button" class="opt-card' + selected + '" data-service="' + s.service_code + '">' +
      '<b>' + s.service_name.toUpperCase() + '</b>' +
      '<span>' + describeCapacity(s) + ' · ' + durationText(s.duration_minutes).toLowerCase() + '</span>' +
      '<em>' + formatPeso(s.base_price) + '</em></button>';
  }
  byId('serviceChoices').innerHTML = html;

  var buttons = document.querySelectorAll('#serviceChoices [data-service]');
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].onclick = function () {
      chooseService(this.getAttribute('data-service'));
    };
  }
}

// The customer picked a service (by its code: 'SR', 'CS' or 'FL')
function chooseService(code) {
  selectedService = findRows('service', function (s) { return s.service_code === code; })[0];
  guestNumber = selectedService.base_capacity;
  selectedSlot = null;
  selectedRoomId = null;
  guestNames = [];
  redrawBooking();
}

// ---------- Redraw everything in the wizard ----------
function redrawBooking() {
  drawProgress();
  drawServiceChoices();
  drawGuests();
  drawSlots();
  drawRooms();
  drawGuestInputs();
  drawSummary();
  drawReview();
  showStepPanel();
}

// Show only the current step and set the Back / Next buttons
function showStepPanel() {
  for (var i = 1; i <= 6; i++) {
    if (i === currentStep) {
      byId('step-' + i).classList.add('active');
    } else {
      byId('step-' + i).classList.remove('active');
    }
  }
  byId('stepBack').disabled = (currentStep === 1);
  byId('stepNext').textContent = (currentStep === 6) ? 'Review Terms & Book' : 'Next →';
}

// The little step list at the top (01 Service, 02 Date & Time, ...)
function drawProgress() {
  var html = '';
  for (var i = 1; i <= 6; i++) {
    var css = '';
    if (i < currentStep) css = 'done';
    if (i === currentStep) css = 'active';
    html += '<li class="' + css + '" data-step="' + i + '"><span>0' + i + '</span>' + STEP_NAMES[i - 1] + '</li>';
  }
  byId('progress').innerHTML = html;

  // you can click a finished step to go back to it
  var items = document.querySelectorAll('#progress li');
  for (var j = 0; j < items.length; j++) {
    items[j].onclick = function () {
      var number = Number(this.getAttribute('data-step'));
      if (number < currentStep) goToStep(number);
    };
  }
}

function goToStep(number) {
  currentStep = number;
  byId('stepError').textContent = '';
  redrawBooking();
}

// ---------- Step 2: guests ----------
function drawGuests() {
  var s = selectedService;
  var minGuests = getMinGuests(s);
  byId('guestCount').textContent = guestNumber;
  byId('guestMinus').disabled = (guestNumber <= minGuests);
  byId('guestPlus').disabled = (guestNumber >= s.max_capacity);

  if (minGuests === s.max_capacity) {
    byId('guestHint').textContent = 'Fixed at ' + s.max_capacity + '.';
  } else {
    byId('guestHint').textContent = 'Up to ' + s.base_capacity + ' included. Extra: ' + formatPeso(s.extra_person_fee) + ' each (max ' + s.max_capacity + ').';
  }
}

// ---------- Step 2: time slots ----------
function makeSlotButton(slot) {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = (slot.start === selectedSlot) ? 'slot sel' : 'slot';

  var smallText = '';
  if (slot.isPast) {
    smallText = 'PAST';
  } else if (slot.freeRoomIds.length === 0) {
    smallText = 'FULL';
  } else {
    smallText = slot.freeRoomIds.length + ' room(s) free';
  }
  button.innerHTML = formatTime(slot.start) + '<small>' + smallText + '</small>';
  button.disabled = slot.isPast || slot.freeRoomIds.length === 0;

  button.onclick = function () {
    selectedSlot = slot.start;
    selectedRoomId = null;                    // the customer picks the room in step 3
    redrawBooking();
  };
  return button;
}

function drawSlots() {
  currentSlots = getTimeSlots(selectedService, selectedDate);
  var box = byId('timeSlots');
  box.innerHTML = '';

  var anyLeft = false;
  for (var i = 0; i < currentSlots.length; i++) {
    box.appendChild(makeSlotButton(currentSlots[i]));
    if (!currentSlots[i].isPast && currentSlots[i].freeRoomIds.length > 0) anyLeft = true;
  }

  var message = byId('slotMessage');
  if (anyLeft) {
    message.textContent = 'Please arrive 15 minutes before your time.';
    message.className = 'hint';
  } else {
    message.textContent = 'No slots left on this date — please choose another day.';
    message.className = 'hint warn';
  }
}

// ---------- Step 3: choose a room ----------
function makeRoomCard(room, isFree, hasSlot) {
  var button = document.createElement('button');
  button.type = 'button';

  var css = 'room-card ' + (isFree ? 'free' : 'taken');
  if (room.room_id === selectedRoomId) css += ' sel';
  button.className = css;
  button.disabled = !isFree;

  var label = 'Available';
  if (!hasSlot) label = 'Pick a time first';
  else if (!isFree) label = 'Occupied';

  button.innerHTML = '<b>' + room.room_code + '</b><span>' + room.room_name + '</span><em>' + label + '</em>';
  button.onclick = function () {
    selectedRoomId = room.room_id;
    redrawBooking();
  };
  return button;
}

function drawRooms() {
  var box = byId('roomCards');
  box.innerHTML = '';
  var rooms = getRoomsOfService(selectedService);
  var hasSlot = (selectedSlot !== null);

  if (hasSlot) {
    byId('roomIntro').textContent = prettyDate(selectedDate) + ' · ' + formatTime(selectedSlot) + ' – ' +
      formatTime(selectedSlot + selectedService.duration_minutes) + '. Tap an available room.';
  } else {
    byId('roomIntro').textContent = 'Go back and choose a date and time first.';
  }

  var stillSelectedIsFree = false;
  for (var i = 0; i < rooms.length; i++) {
    var isFree = hasSlot && isRoomFree(rooms[i].room_id, selectedDate, selectedSlot, selectedService.duration_minutes, null);
    if (isFree && rooms[i].room_id === selectedRoomId) stillSelectedIsFree = true;
    box.appendChild(makeRoomCard(rooms[i], isFree, hasSlot));
  }
  if (!stillSelectedIsFree) selectedRoomId = null;     // the chosen room is not free anymore
}

// ---------- Step 5: one name box per guest ----------
function makeGuestInput(index) {
  var input = document.createElement('input');
  input.type = 'text';
  input.value = guestNames[index] || '';
  input.placeholder = 'Guest ' + (index + 1) + ' name';
  input.oninput = function () {
    guestNames[index] = input.value;
  };
  return input;
}

function drawGuestInputs() {
  var box = byId('guestNames');
  // don't redraw while the customer is typing in one of the boxes
  if (box.contains(document.activeElement) && box.children.length === guestNumber) return;

  box.innerHTML = '';
  for (var i = 0; i < guestNumber; i++) {
    box.appendChild(makeGuestInput(i));
  }
}

// ---------- Summary box (right side) ----------
function drawSummary() {
  var s = selectedService;
  var extraGuests = Math.max(0, guestNumber - s.base_capacity);

  var timeText = '—';
  var arriveText = '—';
  if (selectedSlot !== null) {
    timeText = formatTime(selectedSlot) + ' – ' + formatTime(selectedSlot + s.duration_minutes);
    arriveText = formatTime(selectedSlot - ARRIVE_EARLY);
  }
  var roomText = '—';
  if (selectedRoomId !== null) roomText = findById('room', selectedRoomId).room_code;

  var rows = [
    ['Service', s.service_name],
    ['Date', prettyDate(selectedDate)],
    ['Time', timeText],
    ['Arrive by', arriveText],
    ['Room', roomText],
    ['Guests', guestNumber],
    ['Base price', formatPeso(s.base_price)]
  ];
  if (s.extra_person_fee > 0) {
    rows.push(['Extra guests (' + extraGuests + ' × ' + formatPeso(s.extra_person_fee) + ')', formatPeso(extraGuests * s.extra_person_fee)]);
  }

  var html = '';
  for (var i = 0; i < rows.length; i++) {
    html += '<div class="sum-row"><span>' + rows[i][0] + '</span><b>' + rows[i][1] + '</b></div>';
  }
  byId('summaryList').innerHTML = html;
  byId('totalPrice').textContent = formatPeso(calculatePrice(s, guestNumber));
}

// ---------- Step 6: review ----------
function getTickedHealthItems() {
  var boxes = document.querySelectorAll('#healthList input');
  var ticked = [];
  for (var i = 0; i < boxes.length; i++) {
    if (boxes[i].checked) ticked.push(boxes[i].value);
  }
  return ticked;
}

function getCleanGuestNames() {
  var names = [];
  for (var i = 0; i < guestNumber; i++) {
    names.push((guestNames[i] || '').trim());
  }
  return names;
}

function drawReview() {
  var s = selectedService;
  var roomText = '—';
  if (selectedRoomId !== null) {
    var room = findById('room', selectedRoomId);
    roomText = room.room_code + ' (' + room.room_name + ')';
  }
  var timeText = '—';
  if (selectedSlot !== null) timeText = formatTime(selectedSlot) + ' – ' + formatTime(selectedSlot + s.duration_minutes);

  var rows = [
    ['Customer', safeText(byId('name').value.trim()) + ' · ' + safeText(byId('phone').value.trim()) + ' · ' + safeText(byId('email').value.trim())],
    ['Service', s.service_name],
    ['Date & time', prettyDate(selectedDate) + ', ' + timeText],
    ['Room', roomText],
    ['Guests', safeText(getCleanGuestNames().join(', '))],
    ['Health declaration', safeText(getTickedHealthItems().join(', '))]
  ];
  var html = '';
  for (var i = 0; i < rows.length; i++) {
    html += '<div class="sum-row"><span>' + rows[i][0] + '</span><b>' + rows[i][1] + '</b></div>';
  }
  byId('reviewList').innerHTML = html;
}

// ---------- Moving between steps ----------

// Returns '' if the step is OK, otherwise the error message to show
function validateStep(step) {
  if (step === 2) {
    if (selectedDate < getTodayText()) return 'Please choose today or a future date.';
    if (selectedSlot === null) return 'Please choose a time slot.';
  }
  if (step === 3) {
    if (selectedRoomId === null) return 'Please select an available room.';
  }
  if (step === 4) {
    if (getTickedHealthItems().length === 0) return 'Please complete the health declaration (tick "None to declare" if it does not apply).';
  }
  if (step === 5) {
    var fullName = byId('name').value.trim();
    if (fullName.length < 2) return 'Please enter your full name.';
    if (!/^[0-9+()\-\s]{7,}$/.test(byId('phone').value.trim())) return 'Please enter a valid mobile number.';
    if (!/^\S+@\S+\.\S+$/.test(byId('email').value.trim())) return 'Please enter a valid email.';

    // if guest 1 is empty, use the customer's name
    if (!(guestNames[0] || '').trim()) {
      guestNames[0] = fullName;
      var firstBox = byId('guestNames').children[0];
      if (firstBox) firstBox.value = fullName;
    }
    var names = getCleanGuestNames();
    for (var i = 0; i < names.length; i++) {
      if (names[i] === '') return 'Please type the name of guest ' + (i + 1) + '.';
    }
  }
  return '';
}

function handleNext() {
  var error = validateStep(currentStep);
  byId('stepError').textContent = error;
  if (error) return;

  if (currentStep < 6) {
    goToStep(currentStep + 1);
  } else {
    byId('agree').checked = false;
    byId('confirmBtn').disabled = true;
    byId('termsModal').classList.add('open');
  }
}

function handleBack() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

// ---------- Final step: save the appointment ----------
function confirmBooking() {
  var s = selectedService;

  // check one more time that the room is still free
  if (!isRoomFree(selectedRoomId, selectedDate, selectedSlot, s.duration_minutes, null)) {
    byId('termsModal').classList.remove('open');
    selectedSlot = null;
    selectedRoomId = null;
    goToStep(2);
    byId('stepError').textContent = 'Sorry, that room was just taken. Please pick another time.';
    return;
  }

  var appointment = createAppointment({
    fullName: byId('name').value.trim(),
    email: byId('email').value.trim(),
    phone: byId('phone').value.trim(),
    serviceId: s.service_id,
    roomId: selectedRoomId,
    date: selectedDate,
    start: selectedSlot,
    guestNames: getCleanGuestNames(),
    healthItems: getTickedHealthItems(),
    notes: byId('healthNotes').value.trim()
  });

  byId('termsModal').classList.remove('open');
  byId('doneRef').textContent = apptCode(appointment);

  var rows = [
    ['Customer', safeText(getCustomer(appointment).full_name)],
    ['Service', s.service_name],
    ['Room', getRoom(appointment).room_code],
    ['Date', prettyDate(selectedDate)],
    ['Time', formatTime(selectedSlot) + ' – ' + formatTime(selectedSlot + s.duration_minutes)],
    ['Please arrive by', formatTime(selectedSlot - ARRIVE_EARLY)],
    ['Total', formatPeso(appointment.total_amount)]
  ];
  var html = '';
  for (var i = 0; i < rows.length; i++) {
    html += '<div class="sum-row"><span>' + rows[i][0] + '</span><b>' + rows[i][1] + '</b></div>';
  }
  byId('doneInfo').innerHTML = html;
  byId('doneModal').classList.add('open');
}

// ---------- Connect the booking buttons ----------
function setupCustomerSite() {

  // phone menu button
  byId('menuBtn').onclick = function () {
    byId('menu').classList.toggle('open');
  };

  // first service = the first one in the SERVICE table
  selectedService = getActiveServices()[0];
  guestNumber = selectedService.base_capacity;

  // date input: today up to 60 days ahead
  var dateInput = byId('date');
  var lastDate = new Date();
  lastDate.setDate(lastDate.getDate() + 60);
  dateInput.min = getTodayText();
  dateInput.max = dateToText(lastDate);
  dateInput.value = selectedDate;
  dateInput.onchange = function () {
    selectedDate = dateInput.value || getTodayText();
    selectedSlot = null;
    selectedRoomId = null;
    redrawBooking();
  };

  // guest + and -
  byId('guestMinus').onclick = function () {
    if (guestNumber > getMinGuests(selectedService)) guestNumber = guestNumber - 1;
    redrawBooking();
  };
  byId('guestPlus').onclick = function () {
    if (guestNumber < selectedService.max_capacity) guestNumber = guestNumber + 1;
    redrawBooking();
  };

  // health boxes: "None to declare" cannot be ticked together with the others
  var healthBoxes = document.querySelectorAll('#healthList input');
  for (var h = 0; h < healthBoxes.length; h++) {
    healthBoxes[h].onchange = function () {
      if (this.id === 'healthNone' && this.checked) {
        for (var x = 0; x < healthBoxes.length; x++) {
          if (healthBoxes[x] !== this) healthBoxes[x].checked = false;
        }
      } else if (this.id !== 'healthNone' && this.checked) {
        byId('healthNone').checked = false;
      }
      drawReview();
    };
  }

  // update the review when details change
  var detailBoxes = ['name', 'phone', 'email'];
  for (var d = 0; d < detailBoxes.length; d++) {
    byId(detailBoxes[d]).oninput = drawReview;
  }

  // Back / Next
  byId('stepBack').onclick = handleBack;
  byId('stepNext').onclick = handleNext;

  // Terms pop-up
  byId('agree').onchange = function () {
    byId('confirmBtn').disabled = !byId('agree').checked;
  };
  byId('confirmBtn').onclick = confirmBooking;
  byId('termsClose').onclick = function () {
    byId('termsModal').classList.remove('open');
  };
  byId('termsModal').onclick = function (event) {
    if (event.target === byId('termsModal')) byId('termsModal').classList.remove('open');
  };

  // after booking: go home with a fresh empty form
  byId('doneHome').onclick = function (event) {
    event.preventDefault();
    location.hash = '#home';
    location.reload();
  };

  drawServiceCards();
  redrawBooking();
  setInterval(redrawBooking, 60000);        // refresh once a minute so past slots get disabled
}


/* =====================================================================
   7. ADMIN PAGE
   ===================================================================== */

var adminDate = getTodayText();       // the day the admin is looking at
var adminView = 'calendar';           // 'calendar', 'therapists', 'reports' or 'database'
var openAppointmentId = null;         // appointment shown in the details pop-up

var PAGE_TITLES = {
  calendar: 'Appointment Schedule',
  therapists: 'Therapist Assignment',
  reports: 'Daily Reports',
  database: 'Database'
};

// ---------- Login (uses the USER table) ----------

function getCurrentUser() {
  var id = Number(sessionStorage.getItem(LOGIN_KEY));
  if (!id) return null;
  return findById('user', id);
}

function checkLogin() {
  var user = getCurrentUser();
  if (user) {
    byId('loginPage').style.display = 'none';
    byId('dashboard').classList.add('on');
    byId('whoAmI').textContent = user.full_name + ' (' + user.role.replace('_', ' ') + ')';

    // hide things that only a manager may use
    var managerOnly = document.querySelectorAll('[data-role="manager"]');
    for (var i = 0; i < managerOnly.length; i++) {
      managerOnly[i].style.display = (user.role === 'manager') ? '' : 'none';
    }
    if (user.role !== 'manager' && adminView === 'database') {
      openTab('calendar', document.querySelector('.tab[data-view="calendar"]'));
    }
    redrawAdmin();
  } else {
    byId('loginPage').style.display = 'grid';
    byId('dashboard').classList.remove('on');
  }
}

function handleLogin(event) {
  event.preventDefault();
  var login = byId('username').value.trim().toLowerCase();
  var hash = simpleHash(byId('password').value);

  var matches = findRows('user', function (u) {
    var nameMatches = (u.username.toLowerCase() === login || u.email.toLowerCase() === login);
    return u.is_active && nameMatches && u.password_hash === hash;
  });

  if (matches.length > 0) {
    sessionStorage.setItem(LOGIN_KEY, matches[0].user_id);
    byId('loginError').textContent = '';
    checkLogin();
  } else {
    byId('loginError').textContent = 'Wrong username or password.';
  }
}

// Remember WHICH staff user touched an appointment (appointment.managed_by)
function touchAppointment(appointmentId) {
  var user = getCurrentUser();
  if (user) updateRow('appointment', appointmentId, { managed_by: user.user_id });
}

function redrawAdmin() {
  if (!getCurrentUser()) return;
  if (adminView === 'calendar') drawCalendar();
  else if (adminView === 'therapists') drawTherapists();
  else if (adminView === 'reports') drawReports();
  else if (adminView === 'database') drawDatabase();
  if (byId('detailModal').classList.contains('open')) drawDetails();
}

var toastTimer = null;
function showToast(message) {
  var toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
}

// Appointments of the day the admin is viewing, sorted by time
function getAppointmentsOfDay(includeCancelled) {
  var list = findRows('appointment', function (a) {
    if (apptDate(a) !== adminDate) return false;
    if (a.status === 'cancelled' && !includeCancelled) return false;
    return true;
  });
  list.sort(function (x, y) { return apptStart(x) - apptStart(y); });
  return list;
}

// ---------- A. SCHEDULE CALENDAR ----------

function positionPercent(minutes) {
  return (minutes - OPEN_TIME) / (CLOSE_TIME - OPEN_TIME) * 100;
}

function drawCalendar() {
  var appointments = getAppointmentsOfDay(false);
  var isToday = (adminDate === getTodayText());
  var now = getNowMinutes();
  var totalMinutes = CLOSE_TIME - OPEN_TIME;

  // hour labels
  var html = '<div class="cal-head"><div></div><div class="hours">';
  for (var t = OPEN_TIME; t <= CLOSE_TIME; t += 60) {
    html += '<span style="left:' + positionPercent(t) + '%">' + formatTime(t).replace(':00', '') + '</span>';
  }
  html += '</div></div>';

  // one row for every room in the ROOM table
  for (var r = 0; r < db.room.length; r++) {
    var room = db.room[r];
    html += '<div class="cal-row"><div class="rn">' + room.room_code + '<small>' + room.room_name + '</small></div><div class="track">';

    for (var i = 0; i < appointments.length; i++) {
      var a = appointments[i];
      if (a.room_id !== room.room_id) continue;

      var status = getAppointmentStatus(a);
      var start = apptStart(a);
      var end = apptEnd(a);
      var therapists = getTherapistsOf(a);
      var therapistText = '';
      if (therapists.length > 0) therapistText = ' · ' + safeText(therapists[0].full_name.split(' ')[0]);

      html += '<div class="blk ' + status + '" data-id="' + a.appointment_id + '" style="left:' + positionPercent(start) + '%;width:' + ((end - start) / totalMinutes * 100) + '%">' +
        '<b>' + safeText(getCustomer(a).full_name) + '</b>' +
        '<small>' + formatTime(start) + '–' + formatTime(end) + ' · ' + a.guest_count + ' pax' + therapistText + '</small></div>';

      // yellow striped cleaning block after the session
      var cleaningMinutes = Math.min(CLEANING_GAP, CLOSE_TIME - end);
      if (cleaningMinutes > 0) {
        var task = getCleaningTask(a);
        var css = 'blk cleaning';
        var text = '🧹';
        if (status === 'cleaning') { css += ' live'; text = 'CLEANING'; }
        if (task && task.status === 'done') text = '✓';
        html += '<div class="' + css + '" style="left:' + positionPercent(end) + '%;width:' + (cleaningMinutes / totalMinutes * 100) + '%">' + text + '</div>';
      }
    }

    if (isToday && now >= OPEN_TIME && now <= CLOSE_TIME) {
      html += '<div class="nowline" style="left:' + positionPercent(now) + '%"></div>';
    }
    html += '</div></div>';
  }
  byId('calendarBox').innerHTML = html;

  var blocks = document.querySelectorAll('.blk[data-id]');
  for (var k = 0; k < blocks.length; k++) {
    blocks[k].onclick = function () {
      openDetails(Number(this.getAttribute('data-id')));
    };
  }
}

// ---------- Details pop-up ----------

function openDetails(appointmentId) {
  openAppointmentId = appointmentId;
  byId('detailModal').classList.add('open');
  drawDetails();
}

function drawDetails() {
  var a = findById('appointment', openAppointmentId);
  if (!a) return;

  var customer = getCustomer(a);
  var service = getService(a);
  var room = getRoom(a);
  var health = getHealth(a);
  var cleaning = getCleaningTask(a);
  var manager = getManager(a);
  var status = getAppointmentStatus(a);
  var paid = getPaidAmount(a);
  var balance = a.total_amount - paid;

  byId('detailTitle').textContent = apptCode(a) + ' · ' + room.room_code;

  // guest names
  var guestNamesList = [];
  var guests = getGuests(a);
  for (var g = 0; g < guests.length; g++) guestNamesList.push(safeText(guests[g].guest_name));

  // health text
  var healthText = 'No declaration';
  if (health) {
    var flags = [];
    if (health.is_pregnant) flags.push('pregnant');
    if (health.has_injury) flags.push('injury');
    if (health.has_medical_condition) flags.push('medical condition');
    healthText = (flags.length > 0 ? '<b class="warn-text">⚠ ' + flags.join(', ') + '</b><br>' : '') + safeText(health.details);
  }

  var rows = [
    ['Customer', safeText(customer.full_name) + '<br>' + safeText(customer.phone) + '<br>' + safeText(customer.email)],
    ['Service', service.service_name],
    ['Date & time', prettyDate(apptDate(a)) + '<br>' + formatTime(apptStart(a)) + ' – ' + formatTime(apptEnd(a)) + ' (+30 min cleaning)'],
    ['Guests (' + a.guest_count + ')', guestNamesList.join(', ')],
    ['Health declaration', healthText],
    ['Total / Paid / Balance', formatPeso(a.total_amount) + ' / ' + formatPeso(paid) + ' / ' + formatPeso(balance)],
    ['Status', '<span class="pill ' + status + '">' + status + '</span>'],
    ['Managed by', manager ? safeText(manager.full_name) : 'Nobody yet']
  ];
  var html = '';
  for (var i = 0; i < rows.length; i++) {
    html += '<div class="sum-row"><span>' + rows[i][0] + '</span><b>' + rows[i][1] + '</b></div>';
  }

  // ----- therapists section -----
  html += '<div class="d-section"><h4>Therapists</h4>' + makeTherapistChips(a) + makeTherapistSelect(a) + '</div>';

  // ----- payments section -----
  html += '<div class="d-section"><h4>Payments</h4>';
  var payments = getPayments(a);
  if (payments.length === 0) html += '<p class="hint">No payment recorded yet.</p>';
  for (var p = 0; p < payments.length; p++) {
    var payer = findById('user', payments[p].recorded_by);
    html += '<div class="pay-row">' + formatPeso(payments[p].amount) + ' · ' + payments[p].payment_method.replace('_', ' ') +
      ' · <span class="pill ' + (payments[p].payment_status === 'paid' ? 'done' : 'cleaning') + '">' + payments[p].payment_status + '</span>' +
      ' <small>by ' + (payer ? safeText(payer.full_name) : '?') + '</small></div>';
  }
  if (a.status !== 'cancelled') {
    html += '<div class="pay-form">' +
      '<input type="number" id="payAmount" min="1" value="' + Math.max(balance, 0) + '">' +
      '<select id="payMethod"><option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select>' +
      '<select id="payStatus"><option value="paid">Paid</option><option value="pending">Pending</option></select>' +
      '<button type="button" class="sbtn" data-action="add-payment">Record</button></div>';
  }
  html += '</div>';

  // ----- cleaning section -----
  if (cleaning) {
    html += '<div class="d-section"><h4>Cleaning task</h4><div class="pay-row">' +
      formatTime(timeToMinutes(cleaning.scheduled_start.slice(11, 16))) + ' – ' + formatTime(timeToMinutes(cleaning.scheduled_end.slice(11, 16))) +
      ' · ' + room.room_code + ' · <span class="pill ' + (cleaning.status === 'done' ? 'done' : 'cleaning') + '">' + cleaning.status + '</span> ';
    if (cleaning.status === 'scheduled') {
      html += '<button type="button" class="sbtn" data-action="clean-done">Mark room cleaned</button>';
    }
    html += '</div></div>';
  }

  byId('detailBody').innerHTML = html;
  byId('cancelBookingBtn').style.display = (a.status === 'cancelled') ? 'none' : '';
}

// ---------- Therapist helpers (used in the pop-up AND the Therapists tab) ----------

// the blue chips with an × button
function makeTherapistChips(a) {
  var therapists = getTherapistsOf(a);
  if (therapists.length === 0) return '<span class="hint">No therapist assigned. </span>';
  var html = '';
  for (var i = 0; i < therapists.length; i++) {
    html += '<span class="chip-x">' + safeText(therapists[i].full_name) +
      '<button type="button" data-action="remove-therapist" data-appt="' + a.appointment_id + '" data-therapist="' + therapists[i].therapist_id + '">×</button></span>';
  }
  return html;
}

// the dropdown to add one more therapist (busy ones are greyed out)
function makeTherapistSelect(a) {
  if (a.status === 'cancelled') return '';
  var assigned = getTherapistsOf(a);
  var html = '<select data-action="add-therapist" data-appt="' + a.appointment_id + '"><option value="">+ Add therapist…</option>';
  for (var i = 0; i < db.therapist.length; i++) {
    var t = db.therapist[i];
    if (!t.is_active) continue;

    var alreadyAssigned = false;
    for (var j = 0; j < assigned.length; j++) {
      if (assigned[j].therapist_id === t.therapist_id) alreadyAssigned = true;
    }
    if (alreadyAssigned) continue;

    var busy = isTherapistBusy(t.therapist_id, apptDate(a), apptStart(a), apptEnd(a) - apptStart(a), a.appointment_id);
    html += '<option value="' + t.therapist_id + '"' + (busy ? ' disabled' : '') + '>' + t.full_name + (busy ? ' (busy)' : '') + '</option>';
  }
  return html + '</select>';
}

function addTherapist(appointmentId, therapistId) {
  insertRow('appointment_therapist', { appointment_id: appointmentId, therapist_id: therapistId });
  touchAppointment(appointmentId);
  showToast('Therapist assigned');
  redrawAdmin();
}

function removeTherapist(appointmentId, therapistId) {
  deleteRows('appointment_therapist', function (l) {
    return l.appointment_id === appointmentId && l.therapist_id === therapistId;
  });
  touchAppointment(appointmentId);
  showToast('Therapist removed');
  redrawAdmin();
}

// ---------- Buttons inside the details pop-up ----------

function handleDetailClick(event) {
  var action = event.target.getAttribute('data-action');
  if (!action) return;
  var id = openAppointmentId;

  if (action === 'remove-therapist') {
    removeTherapist(id, Number(event.target.getAttribute('data-therapist')));
  }

  if (action === 'add-payment') {
    var amount = Number(byId('payAmount').value);
    if (!(amount > 0)) {
      showToast('Type an amount first');
      return;
    }
    var user = getCurrentUser();
    insertRow('payment', {
      appointment_id: id,
      recorded_by: user.user_id,
      amount: amount,
      payment_method: byId('payMethod').value,
      payment_status: byId('payStatus').value,
      paid_at: nowIso()
    });
    touchAppointment(id);
    showToast('Payment recorded');
    redrawAdmin();
  }

  if (action === 'clean-done') {
    var task = getCleaningTask(findById('appointment', id));
    updateRow('cleaning_task', task.cleaning_id, { status: 'done' });
    touchAppointment(id);
    showToast('Room marked as cleaned');
    redrawAdmin();
  }
}

function handleDetailChange(event) {
  if (event.target.getAttribute('data-action') === 'add-therapist' && event.target.value) {
    addTherapist(openAppointmentId, Number(event.target.value));
  }
}

function cancelOpenAppointment() {
  if (!confirm('Cancel this appointment?')) return;
  updateRow('appointment', openAppointmentId, { status: 'cancelled' });
  var task = getCleaningTask(findById('appointment', openAppointmentId));
  if (task) updateRow('cleaning_task', task.cleaning_id, { status: 'cancelled' });
  touchAppointment(openAppointmentId);
  byId('detailModal').classList.remove('open');
  showToast('Appointment cancelled');
  redrawAdmin();
}

// ---------- B. THERAPISTS TAB ----------

function drawTherapists() {
  var appointments = getAppointmentsOfDay(false);

  if (appointments.length === 0) {
    byId('assignTable').innerHTML = '<div class="empty">No appointments on this date. Click "+ Sample data" to see an example.</div>';
  } else {
    var html = '<table class="tbl"><thead><tr><th>Time</th><th>Room</th><th>Client</th><th>Pax</th><th>Status</th><th>Therapists</th></tr></thead><tbody>';
    for (var i = 0; i < appointments.length; i++) {
      var a = appointments[i];
      var status = getAppointmentStatus(a);
      html += '<tr><td>' + formatTime(apptStart(a)) + ' – ' + formatTime(apptEnd(a)) + '</td>' +
        '<td><b>' + getRoom(a).room_code + '</b></td>' +
        '<td>' + safeText(getCustomer(a).full_name) + '</td>' +
        '<td>' + a.guest_count + '</td>' +
        '<td><span class="pill ' + status + '">' + status + '</span></td>' +
        '<td>' + makeTherapistChips(a) + makeTherapistSelect(a) + '</td></tr>';
    }
    html += '</tbody></table>';
    byId('assignTable').innerHTML = html;
  }
  byId('therapistList').innerHTML = makeTherapistScheduleHtml(appointments);
}

function handleAssignClick(event) {
  if (event.target.getAttribute('data-action') === 'remove-therapist') {
    removeTherapist(Number(event.target.getAttribute('data-appt')), Number(event.target.getAttribute('data-therapist')));
  }
}

function handleAssignChange(event) {
  if (event.target.getAttribute('data-action') === 'add-therapist' && event.target.value) {
    addTherapist(Number(event.target.getAttribute('data-appt')), Number(event.target.value));
  }
}

// "What is each therapist doing today?"
function makeTherapistScheduleHtml(appointments) {
  var html = '';
  for (var t = 0; t < db.therapist.length; t++) {
    var therapist = db.therapist[t];
    if (!therapist.is_active) continue;

    var jobs = [];
    var minutes = 0;
    for (var i = 0; i < appointments.length; i++) {
      var list = getTherapistsOf(appointments[i]);
      for (var j = 0; j < list.length; j++) {
        if (list[j].therapist_id === therapist.therapist_id) {
          jobs.push(formatTime(apptStart(appointments[i])) + '–' + formatTime(apptEnd(appointments[i])) + ' @ ' + getRoom(appointments[i]).room_code);
          minutes += apptEnd(appointments[i]) - apptStart(appointments[i]);
        }
      }
    }
    var jobsText = (jobs.length > 0) ? jobs.join(' &nbsp;·&nbsp; ') : 'Free all day';
    html += '<div class="th-card"><h4>' + therapist.full_name + '<span>' + jobs.length + ' session(s) · ' + (minutes / 60).toFixed(1) + ' h</span></h4><p>' + jobsText + '</p></div>';
  }
  return html;
}

// ---------- C. DAILY REPORTS ----------

function makeBarRow(label, percent, valueText) {
  return '<div class="bar"><span>' + label + '</span><div class="bg"><div class="fg" style="width:' + percent + '%"></div></div><b>' + valueText + '</b></div>';
}

function drawReports() {
  var all = getAppointmentsOfDay(true);          // with cancelled
  var active = getAppointmentsOfDay(false);      // without cancelled

  var revenue = 0, collected = 0, guests = 0;
  for (var i = 0; i < active.length; i++) {
    revenue += active[i].total_amount;
    collected += getPaidAmount(active[i]);
    guests += active[i].guest_count;
  }

  // ----- number boxes -----
  var boxes = [
    ['Appointments', active.length],
    ['Total revenue', formatPeso(revenue)],
    ['Collected', formatPeso(collected)],
    ['Balance due', formatPeso(revenue - collected)],
    ['Guests served', guests],
    ['Cancelled', all.length - active.length]
  ];
  var boxesHtml = '';
  for (var b = 0; b < boxes.length; b++) {
    boxesHtml += '<div class="glass kpi"><span>' + boxes[b][0] + '</span><b>' + boxes[b][1] + '</b></div>';
  }
  byId('summaryBoxes').innerHTML = boxesHtml;

  // ----- revenue per service -----
  var perService = [];
  var biggest = 1;
  for (var s = 0; s < db.service.length; s++) {
    var money = 0;
    for (var j = 0; j < active.length; j++) {
      if (active[j].service_id === db.service[s].service_id) money += active[j].total_amount;
    }
    perService.push(money);
    if (money > biggest) biggest = money;
  }
  var revenueHtml = '';
  for (var s2 = 0; s2 < db.service.length; s2++) {
    revenueHtml += makeBarRow(db.service[s2].service_name.split(' ').slice(0, 2).join(' '), perService[s2] / biggest * 100, formatPeso(perService[s2]));
  }
  byId('revenueBars').innerHTML = revenueHtml;

  // ----- room usage -----
  var openMinutes = CLOSE_TIME - OPEN_TIME;
  var usageHtml = '';
  for (var r = 0; r < db.room.length; r++) {
    var used = 0;
    for (var k = 0; k < active.length; k++) {
      if (active[k].room_id === db.room[r].room_id) used += apptEnd(active[k]) - apptStart(active[k]);
    }
    var percent = used / openMinutes * 100;
    usageHtml += makeBarRow(db.room[r].room_code, percent, Math.round(percent) + '%');
  }
  byId('usageBars').innerHTML = usageHtml;

  byId('reportTherapists').innerHTML = makeTherapistScheduleHtml(active);

  // ----- table -----
  if (all.length === 0) {
    byId('reportTable').innerHTML = '<div class="empty">No appointments for this date.</div>';
    return;
  }
  var table = '<table class="tbl"><thead><tr><th>Ref</th><th>Time</th><th>Room</th><th>Client</th><th>Pax</th><th>Therapists</th><th>Status</th><th>Total</th><th>Paid</th></tr></thead><tbody>';
  for (var m = 0; m < all.length; m++) {
    var a = all[m];
    var names = [];
    var therapists = getTherapistsOf(a);
    for (var t = 0; t < therapists.length; t++) names.push(safeText(therapists[t].full_name));
    var status = getAppointmentStatus(a);
    var cancelled = (a.status === 'cancelled');

    table += '<tr><td>' + apptCode(a) + '</td><td>' + formatTime(apptStart(a)) + '–' + formatTime(apptEnd(a)) + '</td><td>' + getRoom(a).room_code + '</td><td>' +
      safeText(getCustomer(a).full_name) + '</td><td>' + a.guest_count + '</td><td>' + (names.length > 0 ? names.join(', ') : '—') + '</td>' +
      '<td><span class="pill ' + status + '">' + status + '</span></td><td>' + (cancelled ? '—' : formatPeso(a.total_amount)) + '</td><td>' + (cancelled ? '—' : formatPeso(getPaidAmount(a))) + '</td></tr>';
  }
  table += '<tr><td colspan="7" class="right-text"><b>TOTAL</b></td><td><b>' + formatPeso(revenue) + '</b></td><td><b>' + formatPeso(collected) + '</b></td></tr></tbody></table>';
  byId('reportTable').innerHTML = table;
}

// ---------- D. DATABASE VIEWER (managers only) ----------

function setupDatabaseViewer() {
  var options = '';
  for (var table in PRIMARY_KEYS) {
    options += '<option value="' + table + '">' + table.toUpperCase() + '</option>';
  }
  byId('dbTable').innerHTML = options;
  byId('dbTable').onchange = drawDatabase;

  var lines = '';
  for (var i = 0; i < ERD_LINES.length; i++) {
    lines += '<li>' + ERD_LINES[i] + '</li>';
  }
  byId('erdList').innerHTML = lines;
}

function drawDatabase() {
  var table = byId('dbTable').value;
  var rows = db[table];
  byId('dbInfo').textContent = rows.length + ' row(s) · primary key: ' + (PRIMARY_KEYS[table] || 'appointment_id + therapist_id');

  if (rows.length === 0) {
    byId('dbRows').innerHTML = '<div class="empty">This table is empty.</div>';
    return;
  }
  var columns = Object.keys(rows[0]);
  var html = '<table class="tbl small"><thead><tr>';
  for (var c = 0; c < columns.length; c++) html += '<th>' + columns[c] + '</th>';
  html += '</tr></thead><tbody>';
  for (var r = 0; r < rows.length; r++) {
    html += '<tr>';
    for (var c2 = 0; c2 < columns.length; c2++) {
      html += '<td>' + safeText(rows[r][columns[c2]]) + '</td>';
    }
    html += '</tr>';
  }
  byId('dbRows').innerHTML = html + '</tbody></table>';
}

// ---------- Tabs, dates and buttons ----------

function changeDay(days) {
  var parts = adminDate.split('-');
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days);
  adminDate = dateToText(date);
  byId('pickDate').value = adminDate;
  redrawAdmin();
}

function openTab(viewName, tabButton) {
  adminView = viewName;

  var tabs = document.querySelectorAll('.tab[data-view]');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  tabButton.classList.add('on');

  var views = document.querySelectorAll('.view');
  for (var j = 0; j < views.length; j++) views[j].classList.remove('on');
  byId('view-' + viewName).classList.add('on');

  byId('pageTitle').textContent = PAGE_TITLES[viewName];
  byId('dateTools').style.display = (viewName === 'database') ? 'none' : '';
  redrawAdmin();
}

function setupAdminPage() {
  byId('loginForm').onsubmit = handleLogin;
  byId('logoutBtn').onclick = function () {
    sessionStorage.removeItem(LOGIN_KEY);
    byId('password').value = '';
    checkLogin();
  };

  var tabs = document.querySelectorAll('.tab[data-view]');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].onclick = function () {
      openTab(this.getAttribute('data-view'), this);
    };
  }

  byId('pickDate').value = adminDate;
  byId('pickDate').onchange = function () {
    adminDate = byId('pickDate').value || getTodayText();
    redrawAdmin();
  };
  byId('prevDay').onclick = function () { changeDay(-1); };
  byId('nextDay').onclick = function () { changeDay(1); };
  byId('todayBtn').onclick = function () {
    adminDate = getTodayText();
    byId('pickDate').value = adminDate;
    redrawAdmin();
  };

  byId('sampleBtn').onclick = function () {
    addSampleAppointments(adminDate);
    showToast('Sample appointments added');
    redrawAdmin();
  };
  byId('clearBtn').onclick = function () {
    if (confirm('Reset the whole database? All appointments and customers will be deleted.')) {
      localStorage.removeItem(DB_KEY);
      loadDatabase();
      showToast('Database reset');
      redrawAdmin();
      redrawBooking();
    }
  };
  byId('printBtn').onclick = function () { window.print(); };

  // pop-up + Therapists tab buttons
  byId('detailBody').onclick = handleDetailClick;
  byId('detailBody').onchange = handleDetailChange;
  byId('assignTable').onclick = handleAssignClick;
  byId('assignTable').onchange = handleAssignChange;
  byId('cancelBookingBtn').onclick = cancelOpenAppointment;
  byId('closeDetailBtn').onclick = function () {
    byId('detailModal').classList.remove('open');
  };
  byId('detailModal').onclick = function (event) {
    if (event.target === byId('detailModal')) byId('detailModal').classList.remove('open');
  };

  setupDatabaseViewer();

  setInterval(function () {
    byId('clock').textContent = new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  }, 1000);
  // refresh every 30 seconds (but not while the details pop-up is open, so typing is not erased)
  setInterval(function () {
    if (!byId('detailModal').classList.contains('open')) redrawAdmin();
  }, 30000);
}


/* =====================================================================
   8. START THE APP
   ===================================================================== */

loadDatabase();                                   // 1) open (or create) the database
setupCustomerSite();                              // 2) connect the customer pages
setupAdminPage();                                 // 3) connect the admin page
window.addEventListener('hashchange', showCorrectPage);
window.addEventListener('keydown', handleArrowKeys);

// if a booking is saved in another browser tab, reload the data here too
window.addEventListener('storage', function (event) {
  if (event.key === DB_KEY) {
    loadDatabase();
    redrawAdmin();
    redrawBooking();
  }
});

if (location.hash === '') {
  location.hash = '#home';
}
showCorrectPage();                                // 4) show the right page
