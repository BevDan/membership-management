#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Drag Club Management System
Tests authentication, role-based access, CRUD operations, and bulk operations
"""

import requests
import sys
import json
import time
import uuid
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

class DragClubAPITester:
    def __init__(self):
        self.base_url = "https://memberfleet.preview.emergentagent.com/api"
        self.mongo_client = MongoClient(os.environ['MONGO_URL'])
        self.db = self.mongo_client[os.environ['DB_NAME']]
        
        # Test users with different roles
        self.test_users = {}
        self.test_sessions = {}
        
        # Test results tracking
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.critical_issues = []

    def log_test(self, name, success, details="", is_critical=False):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"name": name, "details": details})
            if is_critical:
                self.critical_issues.append({"name": name, "details": details})

    def setup_test_users(self):
        """Create test users and sessions following auth_testing.md playbook"""
        print("\n🔧 Setting up test users and sessions...")
        
        # Clean existing test data
        self.db.users.delete_many({"email": {"$regex": "test\\.user\\.*"}})
        self.db.user_sessions.delete_many({"session_token": {"$regex": "test_session_*"}})
        
        # Create test users with different roles
        roles = ['admin', 'full_editor', 'member_editor']
        
        for role in roles:
            timestamp = int(time.time() * 1000)
            user_id = f"test-user-{role}-{timestamp}"
            session_token = f"test_session_{role}_{timestamp}"
            
            # Create user
            user_doc = {
                "user_id": user_id,
                "email": f"test.user.{role}.{timestamp}@example.com",
                "name": f"Test {role.replace('_', ' ').title()} User",
                "role": role,
                "picture": "https://via.placeholder.com/150",
                "created_at": datetime.now(timezone.utc)
            }
            self.db.users.insert_one(user_doc)
            
            # Create session
            session_doc = {
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            }
            self.db.user_sessions.insert_one(session_doc)
            
            self.test_users[role] = user_id
            self.test_sessions[role] = session_token
            
            print(f"    Created {role} user: {user_id}")
            print(f"    Session token: {session_token}")

    def make_request(self, method, endpoint, token=None, data=None, files=None):
        """Make authenticated API request"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            print(f"    Making {method} request to: {url}")
            if token:
                print(f"    Using token: {token[:20]}...")
            
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30, verify=True)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, headers=headers, files=files, timeout=30, verify=True)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=30, verify=True)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=30, verify=True)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30, verify=True)
            
            print(f"    Response status: {response.status_code}")
            return response
        except requests.exceptions.Timeout as e:
            print(f"    Request timeout: {str(e)}")
            return None
        except requests.exceptions.ConnectionError as e:
            print(f"    Connection error: {str(e)}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"    Request error: {str(e)}")
            return None
        except Exception as e:
            print(f"    Unexpected error: {str(e)}")
            return None

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test /auth/me with valid token
        response = self.make_request('GET', 'auth/me', self.test_sessions['admin'])
        if response and response.status_code == 200:
            user_data = response.json()
            success = 'user_id' in user_data and user_data['role'] == 'admin'
            self.log_test("Auth /me with valid token", success, 
                         f"Status: {response.status_code}, Role: {user_data.get('role', 'N/A')}")
        else:
            self.log_test("Auth /me with valid token", False, 
                         f"Status: {response.status_code if response else 'No response'}", True)
        
        # Test /auth/me without token
        response = self.make_request('GET', 'auth/me')
        success = response and response.status_code == 401
        self.log_test("Auth /me without token returns 401", success,
                     f"Status: {response.status_code if response else 'No response'}")

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n👥 Testing Role-Based Access Control...")
        
        # Test admin-only endpoints
        for role in ['admin', 'full_editor', 'member_editor']:
            token = self.test_sessions[role]
            
            # Test user management (admin only)
            response = self.make_request('GET', 'users', token)
            if role == 'admin':
                success = response and response.status_code == 200
                self.log_test(f"Admin endpoint access - {role}", success,
                             f"Status: {response.status_code if response else 'No response'}")
            else:
                success = response and response.status_code == 403
                self.log_test(f"Admin endpoint blocked - {role}", success,
                             f"Status: {response.status_code if response else 'No response'}")
            
            # Test vehicle access (full_editor and admin only)
            response = self.make_request('GET', 'vehicles', token)
            if role in ['admin', 'full_editor']:
                success = response and response.status_code == 200
                self.log_test(f"Vehicle access allowed - {role}", success,
                             f"Status: {response.status_code if response else 'No response'}")
            else:
                # member_editor should still be able to GET vehicles, but not create/update
                success = response and response.status_code == 200
                self.log_test(f"Vehicle read access - {role}", success,
                             f"Status: {response.status_code if response else 'No response'}")

    def test_member_operations(self):
        """Test member CRUD operations"""
        print("\n👤 Testing Member Operations...")
        
        token = self.test_sessions['admin']
        
        # Create member
        member_data = {
            "name": "Test Member",
            "address": "123 Test St",
            "suburb": "Test Suburb",
            "postcode": "12345",
            "phone1": "0412345678",
            "email1": "test.member@example.com",
            "membership_type": "Full",
            "interest": "Drag Racing",
            "financial": True,
            "inactive": False
        }
        
        response = self.make_request('POST', 'members', token, member_data)
        if response and response.status_code == 200:
            created_member = response.json()
            member_id = created_member.get('member_id')
            member_number = created_member.get('member_number')
            
            self.log_test("Create member", True, 
                         f"Created member {member_number} with ID {member_id}")
            
            # Test member search by number
            response = self.make_request('GET', f'members?member_number={member_number}', token)
            success = response and response.status_code == 200 and len(response.json()) == 1
            self.log_test("Search member by number", success,
                         f"Found {len(response.json()) if response and response.status_code == 200 else 0} members")
            
            # Test member search by name
            response = self.make_request('GET', f'members?search=Test Member', token)
            success = response and response.status_code == 200 and len(response.json()) >= 1
            self.log_test("Search member by name", success,
                         f"Found {len(response.json()) if response and response.status_code == 200 else 0} members")
            
            # Test member update with null/empty email fields (key fix to test)
            update_data = {
                "financial": False, 
                "comments": "Updated by test",
                "email1": None,  # Test null email handling
                "email2": "",    # Test empty string handling
                "phone2": None,   # Test null phone handling
                "inactive": True  # Test inactive status update
            }
            response = self.make_request('PUT', f'members/{member_id}', token, update_data)
            success = response and response.status_code == 200
            self.log_test("Update member with null/empty fields", success,
                         f"Status: {response.status_code if response else 'No response'}")
            
            if not success and response:
                try:
                    error_detail = response.json()
                    print(f"    Error details: {error_detail}")
                except:
                    print(f"    Response text: {response.text}")
            
            # Get specific member to verify update
            response = self.make_request('GET', f'members/{member_id}', token)
            success = response and response.status_code == 200
            if success:
                updated_member = response.json()
                success = updated_member.get('financial') == False and updated_member.get('inactive') == True
            self.log_test("Get updated member", success,
                         f"Financial: {updated_member.get('financial') if response and response.status_code == 200 else 'N/A'}, Inactive: {updated_member.get('inactive') if response and response.status_code == 200 else 'N/A'}")
            
            return member_id
        else:
            self.log_test("Create member", False,
                         f"Status: {response.status_code if response else 'No response'}", True)
            return None

    def test_vehicle_operations(self):
        """Test vehicle CRUD operations"""
        print("\n🚗 Testing Vehicle Operations...")
        
        # First create a member to associate vehicles with
        member_id = self.test_member_operations()
        if not member_id:
            self.log_test("Vehicle operations", False, "No member available for vehicle tests", True)
            return None
        
        token = self.test_sessions['full_editor']
        
        # Create vehicle
        vehicle_data = {
            "member_id": member_id,
            "log_book_number": "LB12345",
            "make": "Ford",
            "body_style": "Sedan",
            "model": "Falcon",
            "year": 2010,
            "registration": "TEST123",
            "status": "Active",
            "reason": ""
        }
        
        response = self.make_request('POST', 'vehicles', token, vehicle_data)
        if response and response.status_code == 200:
            created_vehicle = response.json()
            vehicle_id = created_vehicle.get('vehicle_id')
            
            self.log_test("Create vehicle", True,
                         f"Created vehicle {vehicle_id}")
            
            # Test vehicle search by registration
            response = self.make_request('GET', f'vehicles?registration=TEST123', token)
            success = response and response.status_code == 200 and len(response.json()) >= 1
            self.log_test("Search vehicle by registration", success,
                         f"Found {len(response.json()) if response and response.status_code == 200 else 0} vehicles")
            
            # Update vehicle
            update_data = {"status": "Inactive", "reason": "Test update"}
            response = self.make_request('PUT', f'vehicles/{vehicle_id}', token, update_data)
            success = response and response.status_code == 200
            self.log_test("Update vehicle", success,
                         f"Status: {response.status_code if response else 'No response'}")
            
            # Archive vehicle (soft delete)
            response = self.make_request('DELETE', f'vehicles/{vehicle_id}', token)
            success = response and response.status_code == 200
            self.log_test("Archive vehicle", success,
                         f"Status: {response.status_code if response else 'No response'}")
            
            # Test admin-only restore
            admin_token = self.test_sessions['admin']
            response = self.make_request('POST', f'vehicles/{vehicle_id}/restore', admin_token)
            success = response and response.status_code == 200
            self.log_test("Restore vehicle (admin)", success,
                         f"Status: {response.status_code if response else 'No response'}")
            
            # Test admin-only permanent delete
            response = self.make_request('DELETE', f'vehicles/{vehicle_id}/permanent', admin_token)
            success = response and response.status_code == 200
            self.log_test("Permanent delete vehicle (admin)", success,
                         f"Status: {response.status_code if response else 'No response'}")
            
            return vehicle_id
        else:
            self.log_test("Create vehicle", False,
                         f"Status: {response.status_code if response else 'No response'}", True)
            return None

    def test_vehicle_options(self):
        """Test vehicle options management"""
        print("\n⚙️ Testing Vehicle Options...")
        
        admin_token = self.test_sessions['admin']
        
        # Get existing options
        response = self.make_request('GET', 'vehicle-options', admin_token)
        success = response and response.status_code == 200
        self.log_test("Get vehicle options", success,
                     f"Status: {response.status_code if response else 'No response'}")
        
        if success:
            options = response.json()
            print(f"    Found {len(options)} existing options")
        
        # Create new status option
        option_data = {"type": "status", "value": "Test Status"}
        response = self.make_request('POST', 'vehicle-options', admin_token, option_data)
        success = response and response.status_code == 200
        if success:
            created_option = response.json()
            option_id = created_option.get('option_id')
            self.log_test("Create vehicle option", True, f"Created option {option_id}")
            
            # Delete the test option
            response = self.make_request('DELETE', f'vehicle-options/{option_id}', admin_token)
            success = response and response.status_code == 200
            self.log_test("Delete vehicle option", success,
                         f"Status: {response.status_code if response else 'No response'}")
        else:
            self.log_test("Create vehicle option", False,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_bulk_operations(self):
        """Test bulk upload operations"""
        print("\n📁 Testing Bulk Operations...")
        
        token = self.test_sessions['admin']
        
        # Test member CSV upload
        csv_content = """name,address,suburb,postcode,phone1,email1,membership_type,interest,financial
Bulk Test Member,456 Bulk St,Bulk Suburb,67890,0487654321,bulk.test@example.com,Full,Both,true"""
        
        files = {'file': ('test_members.csv', csv_content, 'text/csv')}
        response = self.make_request('POST', 'members/bulk-upload', token, files=files)
        success = response and response.status_code == 200
        self.log_test("Bulk upload members", success,
                     f"Status: {response.status_code if response else 'No response'}")
        
        if success:
            result = response.json()
            print(f"    {result.get('message', 'Upload completed')}")

    def test_export_operations(self):
        """Test export operations"""
        print("\n📤 Testing Export Operations...")
        
        token = self.test_sessions['admin']
        
        # Test member export with filters
        export_data = {
            "receive_emails": True,
            "interest": "Drag Racing"
        }
        
        response = self.make_request('POST', 'members/export', token, export_data)
        success = response and response.status_code == 200
        self.log_test("Export members with filters", success,
                     f"Status: {response.status_code if response else 'No response'}")
        
        if success and response.headers.get('content-type') == 'text/csv':
            print(f"    Export successful, CSV content length: {len(response.content)}")

    def test_printable_member_list(self):
        """Test new printable member list endpoint"""
        print("\n📋 Testing Printable Member List...")
        
        token = self.test_sessions['admin']
        
        # Test the new printable member list endpoint
        response = self.make_request('GET', 'members/printable-list', token)
        success = response and response.status_code == 200
        
        if success:
            members = response.json()
            # Verify it returns a list
            success = isinstance(members, list)
            self.log_test("Get printable member list", success,
                         f"Status: {response.status_code}, Members count: {len(members) if success else 'N/A'}")
            
            # Verify each member has required fields
            if success and len(members) > 0:
                first_member = members[0]
                has_required_fields = 'member_number' in first_member and 'name' in first_member
                self.log_test("Printable list has required fields", has_required_fields,
                             f"Fields: {list(first_member.keys()) if isinstance(first_member, dict) else 'Invalid format'}")
                
                # Check if members are sorted by member_number
                if len(members) > 1:
                    is_sorted = True
                    for i in range(1, len(members)):
                        try:
                            prev_num = int(members[i-1]['member_number'])
                            curr_num = int(members[i]['member_number'])
                            if prev_num > curr_num:
                                is_sorted = False
                                break
                        except (ValueError, KeyError):
                            # Handle non-numeric member numbers
                            prev_str = str(members[i-1].get('member_number', ''))
                            curr_str = str(members[i].get('member_number', ''))
                            if prev_str > curr_str:
                                is_sorted = False
                                break
                    
                    self.log_test("Printable list is sorted by member_number", is_sorted,
                                 f"First: {members[0].get('member_number')}, Last: {members[-1].get('member_number')}")
            else:
                self.log_test("Printable list has members", len(members) > 0,
                             "No members found in printable list")
        else:
            self.log_test("Get printable member list", False,
                         f"Status: {response.status_code if response else 'No response'}", True)

    def test_inactive_member_functionality(self):
        """Test inactive member status functionality"""
        print("\n🚫 Testing Inactive Member Status...")
        
        token = self.test_sessions['admin']
        
        # Create an inactive member
        inactive_member_data = {
            "name": "Inactive Test Member",
            "address": "789 Inactive St",
            "suburb": "Inactive Suburb",
            "postcode": "99999",
            "phone1": "0499999999",
            "email1": "inactive.test@example.com",
            "membership_type": "Full",
            "interest": "Both",
            "financial": True,
            "inactive": True
        }
        
        response = self.make_request('POST', 'members', token, inactive_member_data)
        if response and response.status_code == 200:
            inactive_member = response.json()
            inactive_member_id = inactive_member.get('member_id')
            
            self.log_test("Create inactive member", True, 
                         f"Created inactive member {inactive_member.get('member_number')}")
            
            # Test dashboard stats include inactive count
            response = self.make_request('GET', 'stats/dashboard', token)
            if response and response.status_code == 200:
                stats = response.json()
                has_inactive_count = 'inactive_members' in stats
                has_membership_type_inactive = 'membership_type' in stats and 'inactive' in stats['membership_type']
                
                self.log_test("Dashboard stats include inactive members", has_inactive_count,
                             f"Inactive count: {stats.get('inactive_members', 'Missing')}")
                self.log_test("Dashboard membership type includes inactive", has_membership_type_inactive,
                             f"Membership type inactive: {stats.get('membership_type', {}).get('inactive', 'Missing')}")
            else:
                self.log_test("Dashboard stats", False, 
                             f"Status: {response.status_code if response else 'No response'}", True)
            
            # Test reports with inactive_only filter
            response = self.make_request('GET', 'reports/members?filter_type=inactive_only', token)
            if response and response.status_code == 200:
                inactive_report = response.json()
                has_inactive_member = any(m.get('member_id') == inactive_member_id for m in inactive_report)
                
                self.log_test("Reports inactive_only filter", has_inactive_member,
                             f"Found {len(inactive_report)} inactive members, includes test member: {has_inactive_member}")
            else:
                self.log_test("Reports inactive_only filter", False,
                             f"Status: {response.status_code if response else 'No response'}")
            
            # Test reports exclude inactive by default
            response = self.make_request('GET', 'reports/members?filter_type=all', token)
            if response and response.status_code == 200:
                all_report = response.json()
                excludes_inactive = not any(m.get('member_id') == inactive_member_id for m in all_report)
                
                self.log_test("Reports exclude inactive by default", excludes_inactive,
                             f"All members report count: {len(all_report)}, excludes inactive: {excludes_inactive}")
            else:
                self.log_test("Reports exclude inactive by default", False,
                             f"Status: {response.status_code if response else 'No response'}")
            
            # Test reports include inactive when requested
            response = self.make_request('GET', 'reports/members?filter_type=all&include_inactive=true', token)
            if response and response.status_code == 200:
                inclusive_report = response.json()
                includes_inactive = any(m.get('member_id') == inactive_member_id for m in inclusive_report)
                
                self.log_test("Reports include inactive when requested", includes_inactive,
                             f"Inclusive report count: {len(inclusive_report)}, includes inactive: {includes_inactive}")
            else:
                self.log_test("Reports include inactive when requested", False,
                             f"Status: {response.status_code if response else 'No response'}")
            
            return inactive_member_id
        else:
            self.log_test("Create inactive member", False,
                         f"Status: {response.status_code if response else 'No response'}", True)
            return None
        """Test that member_editor cannot access vehicle creation"""
        print("\n🚫 Testing Member Editor Restrictions...")
        
        member_token = self.test_sessions['member_editor']
        
        # Try to create vehicle (should fail)
        vehicle_data = {
            "member_id": "test_member_id",
            "log_book_number": "RESTRICTED",
            "make": "Test",
            "body_style": "Test",
            "model": "Test",
            "year": 2020,
            "registration": "RESTRICT",
            "status": "Active"
        }
        
        response = self.make_request('POST', 'vehicles', member_token, vehicle_data)
        success = response and response.status_code == 403
        self.log_test("Member editor blocked from vehicle creation", success,
                     f"Status: {response.status_code if response else 'No response'}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Clean test users and sessions
        users_deleted = self.db.users.delete_many({"email": {"$regex": "test\\.user\\.*"}}).deleted_count
        sessions_deleted = self.db.user_sessions.delete_many({"session_token": {"$regex": "test_session_*"}}).deleted_count
        
        # Clean test members and vehicles
        members_deleted = self.db.members.delete_many({"name": {"$regex": ".*Test.*"}}).deleted_count
        vehicles_deleted = self.db.vehicles.delete_many({"registration": {"$regex": "TEST.*"}}).deleted_count
        
        print(f"    Deleted {users_deleted} test users")
        print(f"    Deleted {sessions_deleted} test sessions")
        print(f"    Deleted {members_deleted} test members")
        print(f"    Deleted {vehicles_deleted} test vehicles")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Drag Club Management System Backend Tests")
        print("=" * 60)
        
        try:
            # Setup
            self.setup_test_users()
            
            # Core tests
            self.test_authentication()
            self.test_role_based_access()
            self.test_member_operations()
            self.test_vehicle_operations()
            self.test_vehicle_options()
            self.test_bulk_operations()
            self.test_export_operations()
            self.test_printable_member_list()
            self.test_member_editor_restrictions()
            
        except Exception as e:
            print(f"\n❌ Test suite failed with error: {str(e)}")
            self.critical_issues.append({"name": "Test Suite Error", "details": str(e)})
        
        finally:
            # Cleanup
            self.cleanup_test_data()
            
            # Results
            self.print_results()

    def print_results(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.critical_issues:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.critical_issues)}):")
            for issue in self.critical_issues:
                print(f"  - {issue['name']}: {issue['details']}")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        print("\n" + "=" * 60)
        
        return success_rate >= 80 and len(self.critical_issues) == 0

def main():
    """Main test execution"""
    tester = DragClubAPITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())