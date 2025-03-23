from flask import Blueprint, redirect, request, Response, jsonify, current_app
from flask_login import login_user, logout_user, current_user, login_required
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import uuid
import secrets
import string
from sqlalchemy import select
from .models import User, InviteCode, UserRole, UserStatus
from . import db
import ldap
import logging
def auth_user_ldap(username, password):
    formatted = current_app.config["LDAP_USER_FILTER"].format(input=username, basedn=current_app.config["LDAP_BASEDN"])
    current_app.logger.debug("authenticating %s", username)
    current_app.logger.debug("formatted LDAP query: %s", formatted)
    try:
        
        
        out = current_app.ldap_conn.search_ext_s(current_app.config["LDAP_BASEDN"],ldap.SCOPE_BASE, filterstr=formatted, attrlist=['memberOf'])
        if out[0]:
            dn = out[0][0]
            attrs = out[0][1]
            admin = True
            if attrs and 'memberOf' in attrs.keys() and current_app.config["LDAP_ADMIN_GROUP"]:
                admin_str = '{},{}'.format(current_app.config["LDAP_ADMIN_GROUP"], current_app.config["LDAP_BASEDN"]).encode()
                current_app.logger.debug("matching against admin")
                current_app.logger.debug(admin_str)
                if admin_str in attrs['memberOf']:
                    current_app.logger.debug("matched admin")
                    admin = True
                else:
                    current_app.logger.debug("matched not admin")
                    admin = False
            current_app.logger.debug("user search yielded result")
            conn2 = ldap.initialize(current_app.config["LDAP_URL"])
            current_app.logger.debug("checking")
            try:
                conn2.bind_s(dn, password)
                current_app.logger.debug("authorized user")
                conn2.unbind_s()
                return True, admin
            except ldap.INVALID_CREDENTIALS:
                current_app.logger.debug("not authorized user")
                return False, False
        else:
            current_app.logger.debug("user search yielded no results")
            return False, False
    except:
        logging.exception('')
        current_app.logger.debug("failure at block1")
        return False, False
    return False, False


auth = Blueprint('auth', __name__)
CORS(auth, supports_credentials=True)

def generate_invite_code():
    """Admin creates a new user account directly"""
    alphabet = string.ascii_letters + string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(16))
    return code

@auth.route('/api/login', methods=['POST'])
def login():
    authenticated = False
    username = request.json['username']
    password = request.json['password']
    
    
    stmt = select(User).filter_by(username=username, ldap=False)
    user = db.session.execute(stmt).scalar_one_or_none()

    if user and user.status != UserStatus.ACTIVE.value:
        return Response(response="Account is not active", status=401)

    if user and check_password_hash(user.password, password):
        
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        login_user(user, remember=True)
        
        return jsonify({
            "user": user.json(),
            "isAdmin": user.is_admin()
        })

    if current_app.config["LDAP_ENABLE"]:
        authorised, admin = auth_user_ldap(username, password)
        if authorised:
            
            stmt = select(User).filter_by(username=username, ldap=True)
            userobj = db.session.execute(stmt).scalar_one_or_none()
            
            if not userobj:
                userobj = User(
                    username=username, 
                    ldap=True, 
                    admin=admin,
                    role=UserRole.ADMIN.value if admin else UserRole.USER.value,
                    status=UserStatus.ACTIVE.value
                )
                db.session.add(userobj)
                db.session.commit()
            if userobj.admin != admin:
                
                stmt = select(User).filter_by(id=userobj.id)
                row = db.session.execute(stmt).scalar_one_or_none()
                if row:
                    row.admin = admin
                    row.role = UserRole.ADMIN.value if admin else UserRole.USER.value
                    db.session.commit()
                
            
            userobj.last_login = datetime.datetime.utcnow()
            db.session.commit()
            
            login_user(userobj, remember=True)
            
            return jsonify({
                "user": userobj.json(),
                "isAdmin": userobj.is_admin()
            })
    
    return Response(response="Invalid username or password", status=401)

@auth.route('/api/setup/admin', methods=['POST'])
def setup_admin():
    """
    Create the initial admin account during first-time setup.
    This endpoint is only available when the application has no users.
    """
    from sqlalchemy import select, func
    
    # Check if any users exist
    user_count = db.session.execute(select(func.count()).select_from(User)).scalar_one()
    
    # Only allow creating the admin if no users exist
    if user_count > 0:
        return Response(response="Setup already completed. Use regular registration.", status=403)
    
    username = request.json.get('username')
    password = request.json.get('password')
    email = request.json.get('email')
    
    if not username or not password:
        return Response(response="Username and password are required", status=400)
    
    # Validate username and password
    if len(username) < 3:
        return Response(response="Username must be at least 3 characters", status=400)
    
    if len(password) < 8:
        return Response(response="Password must be at least 8 characters", status=400)
    
    # Check if username is available
    stmt = select(User).filter_by(username=username)
    existing_user = db.session.execute(stmt).scalar_one_or_none()
    if existing_user:
        return Response(response="Username already exists", status=400)
    
    # Check if email is available (if provided)
    if email:
        stmt = select(User).filter_by(email=email)
        existing_email = db.session.execute(stmt).scalar_one_or_none()
        if existing_email:
            return Response(response="Email already exists", status=400)
    
    # Create the admin user
    admin_user = User(
        username=username, 
        password=generate_password_hash(password),
        email=email,
        role=UserRole.ADMIN.value,
        admin=True,
        status=UserStatus.ACTIVE.value
    )

    db.session.add(admin_user)
    db.session.commit()
    
    # Turn off setup mode
    current_app.config['SETUP_MODE'] = False
    
    # Log in the new admin user
    login_user(admin_user, remember=True)

    return jsonify({
        "user": admin_user.json(),
        "isAdmin": admin_user.is_admin(),
        "setupComplete": True
    })

@auth.route('/api/signup', methods=['POST'])
@login_required
def signup():
    """
    Create a new user account (requires admin privileges).
    """
    if not current_user.is_admin():
        return Response(response="Administrator privileges required", status=403)
        
    username = request.json.get('username')
    password = request.json.get('password')
    email = request.json.get('email')
    role = request.json.get('role', UserRole.USER.value)
    
    if not username or not password:
        return Response(response="Username and password are required", status=400)
    
    stmt = select(User).filter_by(username=username)
    existing_user = db.session.execute(stmt).scalar_one_or_none()
    if existing_user:
        return Response(response="Username already exists", status=400)
    
    if email:
        stmt = select(User).filter_by(email=email)
        existing_email = db.session.execute(stmt).scalar_one_or_none()
        if existing_email:
            return Response(response="Email already exists", status=400)
    
    new_user = User(
        username=username, 
        password=generate_password_hash(password),
        email=email,
        role=role,
        admin=(role == UserRole.ADMIN.value),
        status=UserStatus.ACTIVE.value
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"user": new_user.json()})
    
@auth.route('/api/register', methods=['POST'])
def register():
    
    username = request.json.get('username')
    password = request.json.get('password')
    email = request.json.get('email')
    invite_code = request.json.get('invite_code')
    
    if not username or not password or not invite_code:
        return Response(response="Username, password, and invite code are required", status=400)
    
    
    
    stmt = select(InviteCode).filter_by(code=invite_code)
    invite = db.session.execute(stmt).scalar_one_or_none()
    if not invite:
        return Response(response="Invalid invite code", status=400)
    
    if invite.is_used:
        return Response(response="Invite code has already been used", status=400)
        
    if invite.is_expired:
        return Response(response="Invite code has expired", status=400)
    
    
    if invite.email and invite.email != email:
        return Response(response="Invite code is not valid for this email", status=400)
    
    
    
    stmt = select(User).filter_by(username=username)
    existing_user = db.session.execute(stmt).scalar_one_or_none()
    if existing_user:
        return Response(response="Username already exists", status=400)
    
    if email:
        
        stmt = select(User).filter_by(email=email)
        existing_email = db.session.execute(stmt).scalar_one_or_none()
        if existing_email:
            return Response(response="Email already exists", status=400)
            
    
    new_user = User(
        username=username, 
        password=generate_password_hash(password),
        email=email,
        role=UserRole.USER.value,
        admin=False,
        status=UserStatus.ACTIVE.value
    )
    
    db.session.add(new_user)
    
    
    invite.used_by_id = new_user.id
    invite.used_at = datetime.datetime.utcnow()
    
    db.session.commit()
    
    
    login_user(new_user, remember=True)
    
    return jsonify({
        "user": new_user.json(),
        "isAdmin": new_user.is_admin()
    })

@auth.route('/api/invite', methods=['POST'])
@login_required
def create_invite():
    
    if not current_user.is_admin():
        return Response(response="Administrator privileges required", status=403)
    
    email = request.json.get('email')
    expires_days = request.json.get('expires_days', 7)  
    
    
    code = generate_invite_code()
    
    
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=expires_days)
    
    
    invite = InviteCode(
        code=code,
        email=email,
        created_by_id=current_user.id,
        expires_at=expires_at
    )
    
    db.session.add(invite)
    db.session.commit()
    
    return jsonify({"invite": invite.json()})

@auth.route('/api/invites', methods=['GET'])
@login_required
def list_invites():
    
    if not current_user.is_admin():
        return Response(response="Administrator privileges required", status=403)
    
    
    stmt = select(InviteCode).order_by(InviteCode.created_at.desc())
    result = db.session.execute(stmt).scalars().all()
    return jsonify({
        "invites": [invite.json() for invite in result]
    })

@auth.route('/api/invites/<int:invite_id>', methods=['DELETE'])
@login_required
def delete_invite(invite_id):
    
    if not current_user.is_admin():
        return Response(response="Administrator privileges required", status=403)
    
    
    stmt = select(InviteCode).filter_by(id=invite_id)
    invite = db.session.execute(stmt).scalar_one_or_none()
    if not invite:
        return Response(response="Invite code not found", status=404)
    
    db.session.delete(invite)
    db.session.commit()
    
    return Response(status=200)

@auth.route('/api/loggedin', methods=['GET'])
def loggedin():
    if not current_user.is_authenticated:
        return Response(response='false', status=200)
    
    return jsonify({
        "user": current_user.json(),
        "isAdmin": current_user.is_admin()
    })

@auth.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    
    return jsonify({
        "user": current_user.json()
    })

@auth.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    
    display_name = request.json.get('display_name')
    email = request.json.get('email')
    
    
    if email and email != current_user.email:
        
        stmt = select(User).filter_by(email=email)
        existing_email = db.session.execute(stmt).scalar_one_or_none()
        if existing_email:
            return Response(response="Email already exists", status=400)
    
    
    if display_name:
        current_user.display_name = display_name
    
    if email:
        current_user.email = email
    
    db.session.commit()
    
    return jsonify({
        "user": current_user.json()
    })

@auth.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    
    current_password = request.json.get('current_password')
    new_password = request.json.get('new_password')
    
    if not current_password or not new_password:
        return Response(response="Current password and new password are required", status=400)
    
    
    if current_user.ldap:
        return Response(response="LDAP users cannot change password", status=400)
    
    
    if not check_password_hash(current_user.password, current_password):
        return Response(response="Current password is incorrect", status=400)
    
    
    current_user.password = generate_password_hash(new_password)
    db.session.commit()
    
    return Response(status=200)

@auth.route('/api/users', methods=['GET'])
@login_required
def list_users():
    
    if not current_user.is_admin():
        return Response(response="Administrator privileges required", status=403)
    
    
    stmt = select(User)
    users = db.session.execute(stmt).scalars().all()
    return jsonify({
        "users": [user.json() for user in users]
    })

@auth.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    
    if not current_user.is_admin():
        return Response(response="Administrator privileges required", status=403)
    
    
    stmt = select(User).filter_by(id=user_id)
    user = db.session.execute(stmt).scalar_one_or_none()
    if not user:
        return Response(response="User not found", status=404)
    
    
    if user.id == current_user.id and 'role' in request.json:
        return Response(response="Cannot modify your own admin status", status=400)
    
    
    if 'display_name' in request.json:
        user.display_name = request.json['display_name']
    
    if 'email' in request.json:
        
        if request.json['email'] and request.json['email'] != user.email:
            
            stmt = select(User).filter_by(email=request.json['email'])
            existing_email = db.session.execute(stmt).scalar_one_or_none()
            if existing_email:
                return Response(response="Email already exists", status=400)
        user.email = request.json['email']
    
    if 'role' in request.json:
        user.role = request.json['role']
        user.admin = (request.json['role'] == UserRole.ADMIN.value)
    
    if 'status' in request.json:
        user.status = request.json['status']
    
    db.session.commit()
    
    return jsonify({
        "user": user.json()
    })

@auth.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    
    if not current_user.is_admin():
        return Response(response="Administrator privileges required", status=403)
    
    
    if user_id == current_user.id:
        return Response(response="Cannot delete your own account", status=400)
    
    
    stmt = select(User).filter_by(id=user_id)
    user = db.session.execute(stmt).scalar_one_or_none()
    if not user:
        return Response(response="User not found", status=404)
    
    db.session.delete(user)
    db.session.commit()
    
    return Response(status=200)

@auth.route('/api/logout', methods=['POST'])
def logout():
    logout_user()
    return Response(status=200)
