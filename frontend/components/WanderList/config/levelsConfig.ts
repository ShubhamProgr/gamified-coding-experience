export type WanderLevel = {
  id: number;
  tier: string;
  title: string;
  task: string;
  hint: string;
  starterCode: string;
  starterCodeByLanguage: Record<WanderLanguage, string>;
  category: "singly" | "circular" | "doubly";
};

export type WanderLanguage = "python" | "java" | "cpp";

const traversal = `def solve(head):
    curr = head
    while curr:
        print(curr.name)
        curr = curr.next`;

const reverse = `def solve(head):
    prev = None
    curr = head
    while curr:
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node
    return prev`;

const javaTraversal = `static Node solve(Node head) {
    Node curr = head;
    while (curr != null) {
        System.out.println(curr.name);
        curr = curr.next;
    }
    return head;
}`;

const cppTraversal = `Node* solve(Node* head) {
    Node* curr = head;
    while (curr != nullptr) {
        std::cout << curr->name << std::endl;
        curr = curr->next;
    }
    return head;
}`;

const javaReverse = `static Node solve(Node head) {
    Node prev = null;
    Node curr = head;
    while (curr != null) {
        Node nextNode = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextNode;
    }
    return prev;
}`;

const cppReverse = `Node* solve(Node* head) {
    Node* prev = nullptr;
    Node* curr = head;
    while (curr != nullptr) {
        Node* nextNode = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nextNode;
    }
    return prev;
}`;

export const WANDER_LEVELS: WanderLevel[] = [
  ["Search by Value", "Find a landmark by its name.", "Compare curr.name before advancing.", traversal, "singly"],
  ["Trip Odometer", "Count every stop on the itinerary.", "Increment a counter before curr = curr.next.", traversal, "singly"],
  ["Final Destination", "Reach the final stop without stepping past it.", "A tail has no next pointer.", traversal, "singly"],
  ["Morning Espresso", "Insert a cafe after the first stop.", "Save the old next pointer before reconnecting.", traversal, "singly"],
  ["Rainy Day Skip", "Reconnect the route after removing a stop.", "Point the previous node at the removed node's next.", traversal, "singly"],
  ["Sunset Lookout", "Append a new destination to the route.", "Walk until curr.next is None.", traversal, "singly"],
  ["Retracing Steps", "Reverse the route in place.", "Keep prev, curr, and next_node pointers.", reverse, "singly"],
  ["Daily Vacation Loop", "Connect the final stop back to the hotel.", "A circular route has no None next pointer.", traversal, "circular"],
  ["Hop-On Hop-Off Shuttle", "Advance K stops around the circular route.", "Use modulo arithmetic to avoid an endless ride.", traversal, "circular"],
  ["Tourist Trap Radar", "Detect a cycle with slow and fast pointers.", "Move fast twice as quickly as slow.", traversal, "circular"],
  ["Roundabout Entrance", "Find the landmark where the cycle begins.", "Reset one pointer to head after the first meeting.", traversal, "circular"],
  ["Two-Way Boulevard", "Set every next pointer's matching prev pointer.", "When curr.next exists, assign curr.next.prev = curr.", traversal, "doubly"],
  ["Forgot the Passport!", "Walk backwards using prev to return to the hotel.", "The head of a DLL has prev = None.", traversal, "doubly"],
  ["Tour Group Fork", "Split the itinerary into two independent lists.", "Clear both new heads' prev pointers.", traversal, "doubly"],
  ["The Grand Schedule Swap", "Swap adjacent stops without losing any links.", "Reconnect both outside neighbors and all four boundaries.", traversal, "doubly"],
].map(([title, task, hint, starterCode, category], index) => ({
  id: index + 1,
  tier: index < 3 ? "Singly basics" : index < 7 ? "Singly surgery" : index < 11 ? "Circular loops" : "Doubly mastery",
  title,
  task,
  hint,
  starterCode,
  category: category as WanderLevel["category"],
  starterCodeByLanguage: {
    python: starterCode,
    java: starterCode === reverse ? javaReverse : javaTraversal,
    cpp: starterCode === reverse ? cppReverse : cppTraversal,
  },
}));
