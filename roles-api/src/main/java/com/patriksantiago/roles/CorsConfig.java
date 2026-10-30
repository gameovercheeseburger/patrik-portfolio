package com.patriksantiago.roles;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Lets only the portfolio website read the API from a browser. */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final RolesProperties properties;

    public CorsConfig(RolesProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(properties.allowedOrigins().toArray(String[]::new))
                .allowedMethods("GET");
    }
}
