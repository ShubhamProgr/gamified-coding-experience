#ifndef ROVER_HPP
#define ROVER_HPP

#include <iostream>
#include <string>
#include <map>
#include <stdexcept>
#include <algorithm>
#include <cctype>
#include <sstream>

class Rover {
private:
    void _emit(const std::string& action, const std::map<std::string, std::string>& stringFields = {}, const std::map<std::string, int>& intFields = {}) {
        std::stringstream json;
        json << "{\"schema\": \"1.0\", \"action\": \"" << action << "\"";
        
        for (const auto& pair : stringFields) {
            json << ", \"" << pair.first << "\": \"" << pair.second << "\"";
        }
        for (const auto& pair : intFields) {
            json << ", \"" << pair.first << "\": " << pair.second;
        }
        json << "}";
        
        std::cout << json.str() << std::endl;
    }

public:
    void drive(std::string direction) {
        std::transform(direction.begin(), direction.end(), direction.begin(), ::toupper);
        if (direction != "NORTH" && direction != "SOUTH" && direction != "EAST" && direction != "WEST") {
            throw std::invalid_argument("Invalid direction '" + direction + "'. Must be one of: EAST, NORTH, SOUTH, WEST");
        }
        _emit("DRIVE", {{"direction", direction}});
    }

    void drill() {
        _emit("DRILL");
    }

    std::map<std::string, std::string> scan() {
        _emit("SCAN");
        return {};
    }

    void charge(int amount = 10) {
        _emit("CHARGE", {}, {{"amount", amount}});
    }

    std::map<std::string, std::string> get_position() {
        _emit("GET_POSITION");
        return {};
    }

    void log(const std::string& message) {
        _emit("LOG", {{"message", message}});
    }

    void turn_left() {
        _emit("TURN", {{"turn", "LEFT"}});
    }

    void turn_right() {
        _emit("TURN", {{"turn", "RIGHT"}});
    }
};

extern Rover rover;

#ifdef DEFINE_ROVER
Rover rover;
#endif

#endif // ROVER_HPP
