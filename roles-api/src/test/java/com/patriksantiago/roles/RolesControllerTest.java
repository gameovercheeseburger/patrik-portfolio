package com.patriksantiago.roles;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RolesControllerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void returnsRolesFromConfig() throws Exception {
        mvc.perform(get("/api/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("ETL and data pipelines"))
                .andExpect(jsonPath("$.roles.length()").value(5));
    }

    @Test
    void allowsThePortfolioSite() throws Exception {
        mvc.perform(get("/api/roles").header("Origin", "https://patrik-portfolio-omega.vercel.app"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://patrik-portfolio-omega.vercel.app"));
    }

    @Test
    void rejectsOtherSites() throws Exception {
        mvc.perform(get("/api/roles").header("Origin", "https://example.com"))
                .andExpect(status().isForbidden());
    }
}
