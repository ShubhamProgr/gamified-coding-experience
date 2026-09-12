import java.util.Map;
import java.util.HashMap;

public class Rover {
    private void _emit(String action, Map<String, Object> additionalFields) {
        StringBuilder json = new StringBuilder("{\"schema\": \"1.0\", \"action\": \"").append(action).append("\"");
        if (additionalFields != null) {
            for (Map.Entry<String, Object> entry : additionalFields.entrySet()) {
                Object value = entry.getValue();
                if (value instanceof String) {
                    json.append(", \"").append(entry.getKey()).append("\": \"").append(value).append("\"");
                } else {
                    json.append(", \"").append(entry.getKey()).append("\": ").append(value);
                }
            }
        }
        json.append("}");
        System.out.println(json.toString());
        System.out.flush();
    }

    private void _emit(String action) {
        _emit(action, null);
    }

    public void drive(String direction) {
        direction = direction.toUpperCase();
        if (!direction.equals("NORTH") && !direction.equals("SOUTH") && 
            !direction.equals("EAST") && !direction.equals("WEST")) {
            throw new IllegalArgumentException("Invalid direction '" + direction + "'. Must be one of: EAST, NORTH, SOUTH, WEST");
        }
        Map<String, Object> fields = new HashMap<>();
        fields.put("direction", direction);
        _emit("DRIVE", fields);
    }

    public void drill() {
        _emit("DRILL");
    }

    public Map<String, Object> scan() {
        _emit("SCAN");
        return new HashMap<>();
    }

    public void charge(int amount) {
        Map<String, Object> fields = new HashMap<>();
        fields.put("amount", amount);
        _emit("CHARGE", fields);
    }
    
    public void charge() {
        charge(10);
    }

    public Map<String, Object> getPosition() {
        _emit("GET_POSITION");
        return new HashMap<>();
    }

    public void log(String message) {
        Map<String, Object> fields = new HashMap<>();
        fields.put("message", message);
        _emit("LOG", fields);
    }

    public void turnLeft() {
        Map<String, Object> fields = new HashMap<>();
        fields.put("turn", "LEFT");
        _emit("TURN", fields);
    }

    public void turnRight() {
        Map<String, Object> fields = new HashMap<>();
        fields.put("turn", "RIGHT");
        _emit("TURN", fields);
    }
}
