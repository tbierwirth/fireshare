from flask import jsonify, Response

def api_error(message, status_code=400):
    """Standard error response format"""
    return jsonify({"error": message}), status_code

def api_success(data=None, message=None, status_code=200):
    """Standard success response format"""
    response = {}
    if data is not None:
        response.update(data)
    if message is not None:
        response["message"] = message
    return jsonify(response), status_code
