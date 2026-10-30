package com.patriksantiago.roles;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RolesController {

    private final RolesProperties properties;

    public RolesController(RolesProperties properties) {
        this.properties = properties;
    }

    /** GET /api/roles returns {"roles": ["ETL and data pipelines", ...]}. */
    @GetMapping("/roles")
    public ResponseEntity<Map<String, List<String>>> roles() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
                .body(Map.of("roles", properties.roles()));
    }

    /** GET /api/health lets the host check that the app is up. */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
