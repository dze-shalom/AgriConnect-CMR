# Phase 1 Testing Plan

**Version:** 1.0  
**Date:** 2025-10-21  
**Author:** DZE-KUM SHALOM CHOW

## Test Environment Setup

### Hardware
- 1× ESP32 Gateway (with LoRa + WiFi)
- 2× ESP32 Field Nodes (with sensors)
- Power supplies
- WiFi router with internet

### Software
- Arduino IDE with gateway firmware
- Browser for dashboard testing
- Supabase dashboard access
- HiveMQ Cloud console access

---

## Unit Tests

### Test 1: MQTT Connection
**Objective:** Verify gateway can connect to HiveMQ Cloud

**Prerequisites:**
- Gateway powered on
- WiFi credentials configured
- MQTT credentials configured

**Steps:**
1. Power on gateway
2. Monitor serial output
3. Observe MQTT connection attempt

**Expected Results:**
- [ ] Gateway connects to WiFi within 30 seconds
- [ ] MQTT connection established within 10 seconds
- [ ] Connection persists for 1 hour without dropout
- [ ] Auto-reconnects after manual disconnect within 30 seconds

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started | 🏃 In Progress | ✅ Passed | ❌ Failed

---

### Test 2: Data Publishing
**Objective:** Verify sensor data reaches HiveMQ

**Prerequisites:**
- Test 1 passed
- Field node powered on
- Gateway receiving LoRa packets

**Steps:**
1. Observe field node send LoRa packet
2. Check gateway serial output for parsing
3. Verify MQTT publish command
4. Check HiveMQ cloud console

**Expected Results:**
- [ ] Gateway receives LoRa packet
- [ ] JSON parsing successful
- [ ] MQTT publish returns success
- [ ] Message visible in HiveMQ console
- [ ] Message format matches specification

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 3: Database Storage
**Objective:** Verify data reaches Supabase database

**Prerequisites:**
- Test 2 passed
- Database tables created
- Database trigger/function configured

**Steps:**
1. Publish test message to MQTT
2. Wait 5 seconds
3. Query Supabase database
4. Verify data inserted

**Expected Results:**
- [ ] Data appears in database within 5 seconds
- [ ] All fields populated correctly
- [ ] Timestamp in correct format
- [ ] No duplicate entries

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 4: Dashboard Display
**Objective:** Verify dashboard shows real-time data

**Prerequisites:**
- Test 3 passed
- Dashboard deployed
- User account created

**Steps:**
1. Log into dashboard
2. Navigate to data view
3. Trigger field node reading
4. Observe dashboard update

**Expected Results:**
- [ ] Login successful
- [ ] Data displays correctly
- [ ] Real-time update within 10 seconds
- [ ] All sensor readings visible
- [ ] Timestamps correct

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 5: CSV Export
**Objective:** Verify data export functionality

**Prerequisites:**
- At least 24 hours of data in database

**Steps:**
1. Log into dashboard
2. Select date range
3. Click export CSV
4. Open downloaded file

**Expected Results:**
- [ ] CSV downloads successfully
- [ ] File contains correct data
- [ ] All columns present
- [ ] No corrupted rows
- [ ] Timestamps readable

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Integration Tests

### Test 6: End-to-End Flow
**Objective:** Verify complete data path

**Steps:**
1. Field node reads sensors
2. Transmits via LoRa
3. Gateway receives and forwards
4. Cloud stores data
5. Dashboard displays data
6. User exports CSV

**Expected Results:**
- [ ] Complete flow < 10 seconds
- [ ] No data loss
- [ ] All components working

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 7: Internet Outage Recovery
**Objective:** Verify local backup and resync

**Steps:**
1. System running normally
2. Disconnect gateway from internet
3. Continue field node transmissions for 10 minutes
4. Reconnect internet
5. Verify data sync

**Expected Results:**
- [ ] Gateway buffers data locally
- [ ] No crashes during outage
- [ ] Reconnects automatically
- [ ] All buffered data syncs to cloud
- [ ] No data loss

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 8: Multiple Field Nodes
**Objective:** Verify system handles multiple nodes

**Steps:**
1. Deploy 3 field nodes
2. All transmitting simultaneously
3. Monitor for 1 hour

**Expected Results:**
- [ ] Gateway receives all packets
- [ ] No packet collisions
- [ ] All data stored correctly
- [ ] Dashboard shows all nodes

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Load Tests

### Test 9: High Frequency Messages
**Objective:** Test system under load

**Steps:**
1. Configure field nodes for 10-second intervals
2. Run for 1 hour
3. Monitor cloud resources

**Expected Results:**
- [ ] All messages processed
- [ ] No timeouts or errors
- [ ] Database keeps up
- [ ] Dashboard remains responsive

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 10: Dashboard Concurrent Users
**Objective:** Test multiple users simultaneously

**Steps:**
1. Create 5 test user accounts
2. Log in from 5 different devices
3. Navigate and interact simultaneously
4. Monitor for 30 minutes

**Expected Results:**
- [ ] All users can log in
- [ ] Data displays correctly for each
- [ ] No cross-user data leakage
- [ ] Dashboard remains responsive

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Acceptance Tests

### Test 11: User Scenario - Remote Access
**Objective:** Verify real-world usage

**Steps:**
1. User at home (away from farm)
2. Opens dashboard on mobile phone
3. Views sensor data
4. Downloads CSV report

**Expected Results:**
- [ ] Dashboard loads on mobile
- [ ] Data is current (<5 min old)
- [ ] CSV downloads successfully
- [ ] User satisfied with experience

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

### Test 12: 48-Hour Stability Test
**Objective:** Verify system reliability

**Steps:**
1. Deploy system in production configuration
2. Run unattended for 48 hours
3. Monitor logs and metrics

**Expected Results:**
- [ ] No crashes or restarts required
- [ ] >99% uptime
- [ ] No memory leaks
- [ ] No data loss

**Actual Results:**
```
[Record observations here]
```

**Status:** ⏸️ Not Started

---

## Test Summary

**Total Tests:** 12  
**Passed:** 0  
**Failed:** 0  
**Blocked:** 0  
**Not Started:** 12

**Overall Status:** Not Started

**Ready for Production:** ❌ No

---

## Sign-Off

**Tester:** DZE-KUM SHALOM CHOW  
**Date:** 2025-10-21  
**Approved:** ⏸️ Pending
