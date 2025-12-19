from flask import Flask, request, jsonify
app = Flask(__name__)

# Simple in-memory index for testing
INDEX = {}

@app.route('/vectors/upsert', methods=['POST'])
def upsert():
    body = request.get_json() or {}
    for vec in body.get('vectors', []):
        INDEX[vec['id']] = vec
    return jsonify({"upserted_count": len(body.get('vectors', []))})

@app.route('/vectors/query', methods=['POST'])
def query():
    body = request.get_json() or {}
    ids = list(INDEX.keys())[: body.get('top_k', 10)]
    return jsonify({"matches": [{"id": i} for i in ids]})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8100)
