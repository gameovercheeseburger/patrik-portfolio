package com.patriksantiago.roles;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings from application.yml under "portfolio".
 *
 * @param roles          phrases the hero line types out, in order
 * @param allowedOrigins websites allowed to call this API from the browser
 */
@ConfigurationProperties(prefix = "portfolio")
public record RolesProperties(List<String> roles, List<String> allowedOrigins) {

    public RolesProperties {
        roles = roles == null ? List.of() : List.copyOf(roles);
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
