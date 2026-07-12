# TransitOps (FleetPilot) - User Flows & Roles

This document outlines the end-to-end user flows for the four primary roles in the TransitOps system, demonstrating how they interact to manage the complete transport lifecycle.

---

## 1. 🔵 Fleet Manager Flow
**Objective:** Oversee fleet assets, maintenance, vehicle lifecycle, and operational efficiency.

1. **Dashboard Overview:** Logs in and views the Dashboard to check real-time KPIs (Active Vehicles, Available Vehicles, Fleet Utilization).
2. **Vehicle Registration:** Navigates to the **Vehicles** tab and registers a new vehicle (e.g., 'Van-05') with its unique registration number, max load capacity, and acquisition cost.
3. **Dispatching a Trip:** 
   - Goes to the **Trips** tab.
   - Creates a new trip, inputting Source, Destination, and Cargo Weight.
   - Selects an `AVAILABLE` vehicle (system validates cargo weight against vehicle capacity).
   - Selects an `AVAILABLE` driver.
   - Clicks **Dispatch**. The system atomically locks both the vehicle and driver by changing their status to `ON_TRIP`.
4. **Maintenance Management:** Notices a vehicle needs an oil change. Logs it in the **Maintenance** tab, which automatically flags the vehicle as `IN_SHOP`, removing it from future dispatch pools until the log is closed.

---

## 2. 🟢 Driver Flow
**Objective:** Creates trips (if acting as dispatcher), assigns vehicles and drivers, and monitors active deliveries. *(Note: In TransitOps, drivers interact with the system via a mobile-friendly portal).*

1. **Active Trip Monitoring:** Logs in and views their currently assigned `ON_TRIP` delivery.
2. **Offline Support:** If driving through a dead zone, the driver can still interact with the app. Data is queued locally via IndexedDB.
3. **Trip Completion (Proof of Delivery):**
   - Arrives at the destination.
   - Enters the final Odometer reading and Fuel Consumed.
   - Captures a **Cargo Photo** and the receiver's **Signature** directly on their device.
   - Clicks **Complete Trip**.
4. **System Resolution:** The system records the Proof of Delivery, updates the vehicle's permanent odometer, logs the fuel cost, and restores the driver and vehicle to `AVAILABLE` status. If offline, this syncs automatically upon regaining connection.

---

## 3. 🔴 Safety Officer Flow
**Objective:** Ensures driver compliance, tracks license validity, and monitors safety scores.

1. **Driver Auditing:** Logs in and navigates to the **Drivers** tab.
2. **License Expiry Tracking:** The system automatically flags any drivers whose licenses are expiring within 30 days (Orange Warning) or have already expired (Red Critical).
3. **Compliance Action:** The Safety Officer identifies a driver with an expired license and manually updates their status to `SUSPENDED`.
4. **Enforcement:** The system's business rules automatically prevent any `SUSPENDED` driver from appearing in the Trip Dispatch selection dropdown, ensuring 100% compliance.

---

## 4. 🟡 Financial Analyst Flow
**Objective:** Reviews operational expenses, fuel consumption, maintenance costs, and profitability.

1. **Expense Tracking:** Navigates to the **Expenses** and **Fuel** tabs to log miscellaneous costs (tolls, fines, fuel purchases).
2. **Reporting & Analytics:** Navigates to the **Reports** tab to view aggregated financial data.
3. **ROI & Operational Cost Analysis:** Reviews the total Operational Cost (Fuel + Maintenance + Misc) per vehicle. 
4. **Export:** Clicks **Export CSV** to download the financial data for external accounting software, ensuring all trips and fuel logs are accurately reconciled against company revenue.
