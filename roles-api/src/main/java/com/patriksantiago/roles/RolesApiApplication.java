package com.patriksantiago.roles;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class RolesApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(RolesApiApplication.class, args);
    }
}
